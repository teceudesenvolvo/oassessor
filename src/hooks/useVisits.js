import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const VISIT_STATUSES = [
  { value: 'planned', label: 'Planejada' },
  { value: 'in_progress', label: 'Em rota' },
  { value: 'completed', label: 'Concluída' },
  { value: 'canceled', label: 'Cancelada' }
];

const VISIT_RESULTS = [
  { value: 'support_confirmed', label: 'Apoio confirmado' },
  { value: 'undecided', label: 'Indeciso' },
  { value: 'reschedule', label: 'Reagendar' },
  { value: 'not_found', label: 'Não localizado' },
  { value: 'demand_registered', label: 'Demanda registrada' }
];

const parseVisitDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function useVisits(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [visits, setVisits] = useState([]);
  const [voters, setVoters] = useState([]);
  const [assessors, setAssessors] = useState([]);

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

        const visitQuery = query(ref(database, 'visitas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeVisits = onValue(visitQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            titulo: value.titulo || value.nomeEleitor || 'Visita',
            status: value.status || 'planned',
            bairro: normalizeUpper(value.bairro || 'SEM BAIRRO'),
            routeLabel: value.routeLabel || value.rota || '',
            nextContact: value.nextContact || '',
            plannedAt: value.plannedAt || '',
            completedAt: value.completedAt || '',
            result: value.result || '',
            notes: value.notes || value.observacoes || ''
          }));

          list.sort((a, b) => {
            const dateA = parseVisitDate(a.plannedAt) || new Date(0);
            const dateB = parseVisitDate(b.plannedAt) || new Date(0);
            return dateA - dateB;
          });

          setVisits(list);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeVisits);

        const votersRef = ref(database, 'eleitores');
        const voterMap = new Map();

        const syncVoters = () => {
          if (!active) return;
          setVoters([...voterMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
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
                  bairro: normalizeUpper(value.bairro || 'SEM BAIRRO'),
                  cidade: normalizeUpper(value.cidade || 'SEM CIDADE'),
                  telefone: value.telefone || value.whatsapp || ''
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
                  bairro: normalizeUpper(value.bairro || 'SEM BAIRRO'),
                  cidade: normalizeUpper(value.cidade || 'SEM CIDADE'),
                  telefone: value.telefone || value.whatsapp || ''
                });
              });
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar visitas:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const stats = useMemo(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const completed = visits.filter((visit) => visit.status === 'completed').length;
    const planned = visits.filter((visit) => visit.status === 'planned').length;
    const inProgress = visits.filter((visit) => visit.status === 'in_progress').length;
    const today = visits.filter((visit) => String(visit.plannedAt || '').startsWith(todayKey)).length;
    const withRoute = visits.filter((visit) => visit.routeLabel).length;

    return {
      total: visits.length,
      completed,
      planned,
      inProgress,
      today,
      withRoute,
      completionRate: visits.length ? (completed / visits.length) * 100 : 0
    };
  }, [visits]);

  const groupedRoutes = useMemo(() => {
    const map = new Map();
    visits.forEach((visit) => {
      const key = visit.routeLabel || 'Sem rota';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(visit);
    });

    return [...map.entries()].map(([route, items]) => ({
      route,
      items: items.sort((a, b) => (a.plannedAt || '').localeCompare(b.plannedAt || ''))
    }));
  }, [visits]);

  const saveVisit = async (payload, selectedId = null) => {
    if (!adminId) return;

    const linkedVoter = voters.find((item) => item.id === payload.voterId);
    const linkedAssessor = assessors.find((item) => item.id === payload.assessorId);

    const data = {
      titulo: payload.titulo || linkedVoter?.nome || 'Visita',
      voterId: payload.voterId || '',
      nomeEleitor: linkedVoter?.nome || payload.nomeEleitor || '',
      telefoneEleitor: linkedVoter?.telefone || payload.telefoneEleitor || '',
      bairro: linkedVoter?.bairro || payload.bairro || '',
      address: payload.address || '',
      plannedAt: payload.plannedAt || '',
      status: payload.status || 'planned',
      assessorId: payload.assessorId || '',
      assessorResponsavel: linkedAssessor?.nome || payload.assessorResponsavel || '',
      routeLabel: payload.routeLabel || '',
      mapReference: payload.mapReference || '',
      notes: payload.notes || '',
      result: payload.result || '',
      nextContact: payload.nextContact || '',
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (data.status === 'completed' && !data.completedAt) {
      data.completedAt = new Date().toISOString();
    }

    if (selectedId) {
      await update(ref(database, `visitas/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'visitas'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString(),
      completedAt: data.status === 'completed' ? new Date().toISOString() : ''
    });
    return newRef.key;
  };

  const deleteVisit = async (id) => {
    await remove(ref(database, `visitas/${id}`));
  };

  const updateVisitStatus = async (visit, status) => {
    const payload = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'completed') payload.completedAt = new Date().toISOString();
    await update(ref(database, `visitas/${visit.id}`), payload);
  };

  return {
    loading,
    visits,
    voters,
    assessors,
    stats,
    groupedRoutes,
    saveVisit,
    deleteVisit,
    updateVisitStatus,
    visitStatuses: VISIT_STATUSES,
    visitResults: VISIT_RESULTS
  };
}
