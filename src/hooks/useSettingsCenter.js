import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';
import { USER_ROLE_OPTIONS } from './useUsersManagement';
import { logAuditEvent } from '../services/auditService';

const SETTINGS_COLLECTIONS = {
  cargos: 'configCargos',
  bairros: 'configBairros',
  zonas: 'configZonas',
  equipes: 'configEquipes',
  categorias: 'configCategorias'
};

const DEFAULT_INTEGRATIONS = {
  emailInvites: true,
  auditTrail: true,
  aiReady: true,
  storageMigration: false,
  firestoreMigration: false
};

export function useSettingsCenter(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [campaign, setCampaign] = useState({
    id: null,
    nome: '',
    cargoPrincipal: '',
    municipio: '',
    estado: '',
    eleicaoEm: '',
    metaPrincipal: ''
  });
  const [permissionsMatrix, setPermissionsMatrix] = useState([]);
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);
  const [catalogs, setCatalogs] = useState({
    cargos: [],
    bairros: [],
    zonas: [],
    equipes: [],
    categorias: []
  });

  useEffect(() => {
    if (!user) return;

    let active = true;
    const unsubscribes = [];

    const load = async () => {
      try {
        setLoading(true);
        let resolvedAdminId = user.uid;
        let currentUserType = null;

        if (user.email) {
          const assessoresRef = ref(database, 'assessores');
          const qEmail = query(assessoresRef, orderByChild('email'), equalTo(user.email));
          const snapshotEmail = await get(qEmail);
          if (snapshotEmail.exists()) currentUserType = 'assessor';
        }

        const usersRef = ref(database, 'users');
        const qUser = query(usersRef, orderByChild('userId'), equalTo(user.uid));
        const userSnapshot = await get(qUser);
        if (userSnapshot.exists()) {
          const userData = Object.values(userSnapshot.val())[0];
          currentUserType = userData.tipoUser || currentUserType;
          if (userData.adminId) resolvedAdminId = userData.adminId;
        }

        const effectiveAdminId = currentUserType === 'admin' ? user.uid : resolvedAdminId;
        if (!active) return;
        setAdminId(effectiveAdminId);

        unsubscribes.push(
          onValue(query(ref(database, 'metasEleitorais'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            if (!active) return;
            if (!snapshot.exists()) {
              setCampaign((prev) => ({ ...prev, id: null }));
              return;
            }
            const [id, value] = Object.entries(snapshot.val())[0];
            setCampaign({
              id,
              nome: value.nome || value.campanha || '',
              cargoPrincipal: value.cargo || '',
              municipio: value.municipio || '',
              estado: value.estado || '',
              eleicaoEm: value.dataEleicao || '',
              metaPrincipal: value.metaPrincipal || ''
            });
          })
        );

        unsubscribes.push(
          onValue(query(ref(database, 'configIntegracoes'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            if (!active) return;
            if (!snapshot.exists()) {
              setIntegrations(DEFAULT_INTEGRATIONS);
              return;
            }
            const value = Object.values(snapshot.val())[0];
            setIntegrations({ ...DEFAULT_INTEGRATIONS, ...value.flags });
          })
        );

        Object.entries(SETTINGS_COLLECTIONS).forEach(([key, collection]) => {
          unsubscribes.push(
            onValue(query(ref(database, collection), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
              if (!active) return;
              const list = snapshot.exists()
                ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
                : [];
              setCatalogs((prev) => ({ ...prev, [key]: list.sort((a, b) => String(a.nome).localeCompare(String(b.nome))) }));
            })
          );
        });

        unsubscribes.push(
          onValue(query(ref(database, 'configPermissoes'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            if (!active) return;
            if (snapshot.exists()) {
              setPermissionsMatrix(Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })));
            } else {
              setPermissionsMatrix(
                USER_ROLE_OPTIONS.map((role) => ({
                  id: role.value,
                  role: role.value,
                  label: role.label,
                  dashboard: true,
                  voters: ['admin', 'candidate', 'coordinator', 'assessor', 'reader', 'legal'].includes(role.value),
                  funnel: ['admin', 'candidate', 'coordinator', 'assessor', 'mobilizer'].includes(role.value),
                  team: ['admin', 'candidate', 'coordinator'].includes(role.value),
                  territory: ['admin', 'candidate', 'coordinator', 'mobilizer'].includes(role.value),
                  communication: ['admin', 'candidate', 'coordinator', 'assessor', 'communication'].includes(role.value),
                  reports: ['admin', 'candidate', 'coordinator', 'communication', 'financial', 'legal', 'reader'].includes(role.value),
                  settings: role.value === 'admin'
                }))
              );
            }
            setLoading(false);
          })
        );
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const saveCampaign = async (payload) => {
    if (!adminId) return;
    const data = {
      nome: payload.nome || '',
      campanha: payload.nome || '',
      cargo: payload.cargoPrincipal || '',
      municipio: payload.municipio || '',
      estado: payload.estado || '',
      dataEleicao: payload.eleicaoEm || '',
      metaPrincipal: payload.metaPrincipal || '',
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (campaign.id) {
      await update(ref(database, `metasEleitorais/${campaign.id}`), data);
    } else {
      const newRef = push(ref(database, 'metasEleitorais'));
      await set(newRef, { ...data, createdAt: new Date().toISOString() });
    }

    await logAuditEvent({
      user,
      adminId,
      action: 'update',
      entity: 'settings',
      entityId: 'campaign',
      entityLabel: 'Configuração de campanha',
      details: { targetName: payload.nome || 'Campanha', changes: ['campanha', 'metas'] }
    });
  };

  const saveCatalogItem = async (type, payload, selectedId = null) => {
    if (!adminId || !SETTINGS_COLLECTIONS[type]) return;
    const collection = SETTINGS_COLLECTIONS[type];
    const data = {
      nome: payload.nome,
      descricao: payload.descricao || '',
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId) {
      await update(ref(database, `${collection}/${selectedId}`), data);
    } else {
      const newRef = push(ref(database, collection));
      await set(newRef, { ...data, createdAt: new Date().toISOString() });
    }

    await logAuditEvent({
      user,
      adminId,
      action: selectedId ? 'update' : 'create',
      entity: 'settings',
      entityId: type,
      entityLabel: payload.nome || type,
      details: { targetName: payload.nome || type, changes: [type] }
    });
  };

  const deleteCatalogItem = async (type, id, label) => {
    if (!adminId || !SETTINGS_COLLECTIONS[type]) return;
    await remove(ref(database, `${SETTINGS_COLLECTIONS[type]}/${id}`));
    await logAuditEvent({
      user,
      adminId,
      action: 'delete',
      entity: 'settings',
      entityId: type,
      entityLabel: label || type,
      details: { targetName: label || type }
    });
  };

  const savePermissions = async (matrix) => {
    if (!adminId) return;
    const baseRef = ref(database, 'configPermissoes');
    const existingSnapshot = await get(query(baseRef, orderByChild('adminId'), equalTo(adminId)));
    const existingKeys = existingSnapshot.exists() ? Object.keys(existingSnapshot.val()) : [];

    for (let index = 0; index < matrix.length; index += 1) {
      const item = matrix[index];
      const data = {
        role: item.role,
        label: item.label,
        dashboard: !!item.dashboard,
        voters: !!item.voters,
        funnel: !!item.funnel,
        team: !!item.team,
        territory: !!item.territory,
        communication: !!item.communication,
        reports: !!item.reports,
        settings: !!item.settings,
        adminId,
        updatedAt: new Date().toISOString()
      };

      const key = existingKeys[index];
      if (key) {
        await update(ref(database, `configPermissoes/${key}`), data);
      } else {
        const newRef = push(baseRef);
        await set(newRef, { ...data, createdAt: new Date().toISOString() });
      }
    }

    await logAuditEvent({
      user,
      adminId,
      action: 'permission_change',
      entity: 'settings',
      entityId: 'permissions',
      entityLabel: 'Matriz de permissões',
      details: { targetName: 'Permissões', changes: ['dashboard', 'voters', 'funnel', 'team', 'territory', 'communication', 'reports', 'settings'] }
    });
  };

  const saveIntegrations = async (flags) => {
    if (!adminId) return;
    const baseRef = ref(database, 'configIntegracoes');
    const snapshot = await get(query(baseRef, orderByChild('adminId'), equalTo(adminId)));
    const data = {
      adminId,
      flags,
      updatedAt: new Date().toISOString()
    };

    if (snapshot.exists()) {
      const [key] = Object.keys(snapshot.val());
      await update(ref(database, `configIntegracoes/${key}`), data);
    } else {
      const newRef = push(baseRef);
      await set(newRef, { ...data, createdAt: new Date().toISOString() });
    }

    await logAuditEvent({
      user,
      adminId,
      action: 'update',
      entity: 'settings',
      entityId: 'integrations',
      entityLabel: 'Integrações',
      details: { targetName: 'Integrações', changes: Object.keys(flags).filter((key) => flags[key]) }
    });
  };

  const stats = useMemo(() => ({
    catalogs:
      catalogs.cargos.length +
      catalogs.bairros.length +
      catalogs.zonas.length +
      catalogs.equipes.length +
      catalogs.categorias.length,
    roles: permissionsMatrix.length,
    activeIntegrations: Object.values(integrations).filter(Boolean).length
  }), [catalogs, integrations, permissionsMatrix.length]);

  return {
    loading,
    campaign,
    catalogs,
    permissionsMatrix,
    integrations,
    stats,
    setIntegrations,
    saveCampaign,
    saveCatalogItem,
    deleteCatalogItem,
    savePermissions,
    saveIntegrations
  };
}
