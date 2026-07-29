import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

export const LEADERSHIP_ROLES = [
  { value: 'candidate', label: 'Candidato' },
  { value: 'coordinator', label: 'Coordenador' },
  { value: 'leadership', label: 'Liderança' },
  { value: 'mobilizer', label: 'Mobilizador' }
];

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const mapRoleLabel = (role) =>
  LEADERSHIP_ROLES.find((item) => item.value === role)?.label || 'Liderança';

const buildTree = (items) => {
  const map = new Map(
    items.map((item) => [
      item.id,
      {
        ...item,
        children: []
      }
    ])
  );

  const roots = [];
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item);
      return;
    }
    roots.push(item);
  });

  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => {
      const roleIndexA = LEADERSHIP_ROLES.findIndex((role) => role.value === a.role);
      const roleIndexB = LEADERSHIP_ROLES.findIndex((role) => role.value === b.role);
      return roleIndexA - roleIndexB || a.nome.localeCompare(b.nome);
    });
    nodes.forEach((node) => sortRecursive(node.children));
  };

  sortRecursive(roots);
  return roots;
};

export function useLeaderships(user) {
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [leaderships, setLeaderships] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [voters, setVoters] = useState([]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const unsubscribes = [];

    const load = async () => {
      try {
        setLoading(true);

        let currentUserType = null;
        let resolvedAdminId = user.uid;

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
        setUserType(currentUserType || 'assessor');

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessorsList = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({
              id,
              ...value,
              nome: value.nome || value.name || value.email || 'Assessor'
            }))
          : [];
        if (!active) return;
        setAssessors(assessorsList);

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessorsList.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const leadershipRef = query(ref(database, 'liderancas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeLeaderships = onValue(leadershipRef, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            nome: value.nome || 'Sem nome',
            bairro: normalizeUpper(value.bairro || 'Sem bairro'),
            areaInfluencia: normalizeUpper(value.areaInfluencia || 'Sem área'),
            role: value.role || 'leadership',
            roleLabel: mapRoleLabel(value.role || 'leadership'),
            voterIds: value.voterIds ? Object.values(value.voterIds) : [],
            assignedVotersCount: value.voterIds ? Object.keys(value.voterIds).length : 0
          }));
          setLeaderships(list);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeLeaderships);

        const votersRef = ref(database, 'eleitores');
        const voterMap = new Map();
        const syncVoters = () => {
          if (!active) return;
          setVoters([...voterMap.values()]);
        };

        ownerIds.forEach((ownerId) => {
          const votersQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...voterMap.keys()].forEach((key) => {
              if (voterMap.get(key)?.creatorId === ownerId) voterMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                voterMap.set(id, {
                  id,
                  ...value,
                  nome: value.nome || 'Eleitor',
                  bairro: normalizeUpper(value.bairro || 'Sem bairro'),
                  cidade: normalizeUpper(value.cidade || 'Sem cidade')
                });
              });
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const votersQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...voterMap.keys()].forEach((key) => {
              if (voterMap.get(key)?.creatorEmail === email) voterMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                voterMap.set(id, {
                  id,
                  ...value,
                  nome: value.nome || 'Eleitor',
                  bairro: normalizeUpper(value.bairro || 'Sem bairro'),
                  cidade: normalizeUpper(value.cidade || 'Sem cidade')
                });
              });
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar lideranças:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const voterAssignmentMap = useMemo(() => {
    const map = new Map();
    leaderships.forEach((leadership) => {
      leadership.voterIds.forEach((voterId) => {
        map.set(voterId, leadership.id);
      });
    });
    return map;
  }, [leaderships]);

  const availableVoters = useMemo(
    () =>
      voters.filter((voter) => !voterAssignmentMap.has(voter.id)),
    [voters, voterAssignmentMap]
  );

  const tree = useMemo(() => buildTree(leaderships), [leaderships]);

  const saveLeadership = async (payload, selectedId = null) => {
    if (!adminId) return;

    const voterIdsObject = {};
    (payload.voterIds || []).forEach((voterId) => {
      voterIdsObject[voterId] = voterId;
    });

    const data = {
      nome: payload.nome,
      telefone: payload.telefone || '',
      endereco: payload.endereco || '',
      bairro: normalizeUpper(payload.bairro || ''),
      areaInfluencia: normalizeUpper(payload.areaInfluencia || ''),
      quantidadePrometida: Number(payload.quantidadePrometida || 0),
      quantidadeConfirmada: Number(payload.quantidadeConfirmada || 0),
      observacoes: payload.observacoes || '',
      assessorResponsavel: payload.assessorResponsavel || '',
      role: payload.role || 'leadership',
      parentId: payload.parentId || '',
      voterIds: voterIdsObject,
      adminId,
      updatedAt: new Date().toISOString()
    };

    const duplicateVoter = (payload.voterIds || []).find((voterId) => {
      const assignedTo = voterAssignmentMap.get(voterId);
      return assignedTo && assignedTo !== selectedId;
    });

    if (duplicateVoter) {
      throw new Error('Um dos eleitores selecionados já está vinculado a outra liderança.');
    }

    if (selectedId) {
      await update(ref(database, `liderancas/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'liderancas'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteLeadership = async (id) => {
    await remove(ref(database, `liderancas/${id}`));
  };

  return {
    loading,
    userType,
    leaderships,
    tree,
    assessors,
    voters,
    availableVoters,
    saveLeadership,
    deleteLeadership
  };
}
