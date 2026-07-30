import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';
import { logAuditEvent } from '../services/auditService';

export const USER_ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'candidate', label: 'Candidato' },
  { value: 'coordinator', label: 'Coordenador' },
  { value: 'assessor', label: 'Assessor' },
  { value: 'mobilizer', label: 'Mobilizador' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'legal', label: 'Jurídico' },
  { value: 'reader', label: 'Leitura' }
];

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  voters: true,
  funnel: true,
  team: false,
  territory: false,
  communication: false,
  reports: false,
  settings: false
};

export const USER_ROLE_DEFAULTS = {
  admin: { ...DEFAULT_PERMISSIONS, team: true, territory: true, communication: true, reports: true, settings: true },
  candidate: { ...DEFAULT_PERMISSIONS, team: true, territory: true, communication: true, reports: true },
  coordinator: { ...DEFAULT_PERMISSIONS, team: true, territory: true, communication: true, reports: true },
  assessor: { ...DEFAULT_PERMISSIONS, communication: true },
  mobilizer: { ...DEFAULT_PERMISSIONS, funnel: true, territory: true },
  communication: { ...DEFAULT_PERMISSIONS, communication: true, reports: true },
  financial: { dashboard: true, reports: true, settings: false, voters: false, funnel: false, team: false, territory: false, communication: false },
  legal: { dashboard: true, reports: true, voters: true, funnel: false, team: false, territory: false, communication: false, settings: false },
  reader: { dashboard: true, voters: true, funnel: false, team: false, territory: false, communication: false, reports: true, settings: false }
};

export function useUsersManagement(user) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const load = async () => {
      try {
        setLoading(true);

        const assessoresRef = ref(database, 'assessores');
        const assessorsQuery = query(assessoresRef, orderByChild('adminId'), equalTo(user.uid));
        const usersRef = ref(database, 'users');
        const adminUserQuery = query(usersRef, orderByChild('userId'), equalTo(user.uid));

        const adminSnapshot = await get(adminUserQuery);
        const adminProfile = adminSnapshot.exists() ? Object.values(adminSnapshot.val())[0] : null;

        const unsubscribe = onValue(assessorsQuery, (snapshot) => {
          if (!active) return;
          const members = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, value]) => ({
                id,
                ...value,
                nome: value.nome || value.name || value.email || 'Usuário',
                tipoUser: value.tipoUser || 'assessor',
                permissions: value.permissions || USER_ROLE_DEFAULTS[value.tipoUser || 'assessor'] || DEFAULT_PERMISSIONS
              }))
            : [];

          const adminRow = adminProfile
            ? [{
                id: user.uid,
                nome: adminProfile.nome || adminProfile.name || user.email || 'Administrador',
                email: adminProfile.email || user.email || '',
                cargo: adminProfile.cargo || 'Administrador',
                tipoUser: 'admin',
                status: 'Ativo',
                permissions: USER_ROLE_DEFAULTS.admin,
                isPrimaryAdmin: true
              }]
            : [];

          setUsers([...adminRow, ...members]);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        if (active) setLoading(false);
      }
    };

    let unsubscribeRef = null;
    load().then((unsubscribe) => {
      unsubscribeRef = unsubscribe;
    });

    return () => {
      active = false;
      if (typeof unsubscribeRef === 'function') unsubscribeRef();
    };
  }, [user]);

  const stats = useMemo(() => {
    const byRole = USER_ROLE_OPTIONS.reduce((acc, role) => {
      acc[role.value] = users.filter((userItem) => userItem.tipoUser === role.value).length;
      return acc;
    }, {});

    return {
      total: users.length,
      active: users.filter((item) => (item.status || '').toLowerCase() !== 'inativo').length,
      pending: users.filter((item) => (item.status || '').toLowerCase() === 'invited').length,
      byRole
    };
  }, [users]);

  const saveUser = async (payload, selectedId = null) => {
    const permissions = payload.permissions || USER_ROLE_DEFAULTS[payload.tipoUser] || DEFAULT_PERMISSIONS;
    const currentEntry = selectedId ? users.find((entry) => entry.id === selectedId) : null;
    const data = {
      nome: payload.nome,
      email: payload.email,
      cargo: payload.cargo || '',
      cpf: payload.cpf || '',
      telefone: payload.telefone || '',
      tipoUser: payload.tipoUser || 'assessor',
      permissions,
      status: payload.status || 'Ativo',
      adminId: user.uid,
      updatedAt: new Date().toISOString()
    };

    if (selectedId && selectedId !== user.uid) {
      await update(ref(database, `assessores/${selectedId}`), data);
      await update(ref(database, `users/${selectedId}`), data);
      await logAuditEvent({
        user,
        adminId: user.uid,
        action: 'update',
        entity: 'user',
        entityId: selectedId,
        entityLabel: payload.nome || payload.email || 'Usuário',
        details: {
          targetName: payload.nome || payload.email || 'Usuário',
          changes: ['perfil atualizado']
        }
      });
      if (JSON.stringify(currentEntry?.permissions || {}) !== JSON.stringify(permissions)) {
        await logAuditEvent({
          user,
          adminId: user.uid,
          action: 'permission_change',
          entity: 'user',
          entityId: selectedId,
          entityLabel: payload.nome || payload.email || 'Usuário',
          details: {
            targetName: payload.nome || payload.email || 'Usuário',
            changes: Object.entries(permissions)
              .filter(([key, value]) => currentEntry?.permissions?.[key] !== value)
              .map(([key]) => key)
          }
        });
      }
      return selectedId;
    }

    const newRef = push(ref(database, 'assessores'));
    await set(newRef, {
      ...data,
      creatorId: user.uid,
      createdAt: new Date().toISOString(),
      inviteLink: `https://oassessor.vercel.app/cadastro?email=${encodeURIComponent(payload.email || '')}`
    });
    await set(ref(database, `users/${newRef.key}`), {
      ...data,
      creatorId: user.uid,
      createdAt: new Date().toISOString()
    });
    await logAuditEvent({
      user,
      adminId: user.uid,
      action: 'create',
      entity: 'user',
      entityId: newRef.key,
      entityLabel: payload.nome || payload.email || 'Usuário',
      details: {
        targetName: payload.nome || payload.email || 'Usuário',
        role: payload.tipoUser || 'assessor'
      }
    });
    return newRef.key;
  };

  const deleteUser = async (id) => {
    if (id === user.uid) throw new Error('O administrador principal não pode ser removido nesta tela.');
    const currentEntry = users.find((entry) => entry.id === id);
    await remove(ref(database, `assessores/${id}`));
    await remove(ref(database, `users/${id}`));
    await logAuditEvent({
      user,
      adminId: user.uid,
      action: 'delete',
      entity: 'user',
      entityId: id,
      entityLabel: currentEntry?.nome || currentEntry?.email || 'Usuário',
      details: {
        targetName: currentEntry?.nome || currentEntry?.email || 'Usuário'
      }
    });
  };

  return {
    loading,
    users,
    stats,
    roleDefaults: USER_ROLE_DEFAULTS,
    saveUser,
    deleteUser
  };
}
