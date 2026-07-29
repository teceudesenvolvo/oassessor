import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

export const DEMAND_STATUSES = [
  { value: 'received', label: 'Recebida' },
  { value: 'under_review', label: 'Em análise' },
  { value: 'forwarded', label: 'Encaminhada' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'answered', label: 'Respondida' },
  { value: 'completed', label: 'Concluída' }
];

const parseDate = (value) => {
  if (!value) return new Date(0);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const ensureTimelineObject = (timeline = []) => {
  const result = {};
  timeline.forEach((entry) => {
    const id = entry.id || push(ref(database, 'tmp')).key;
    result[id] = {
      status: entry.status || 'received',
      title: entry.title || 'Atualização',
      description: entry.description || '',
      createdAt: entry.createdAt || new Date().toISOString(),
      actorName: entry.actorName || 'Sistema'
    };
  });
  return result;
};

export function useDemands(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [demands, setDemands] = useState([]);
  const [voters, setVoters] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [visits, setVisits] = useState([]);

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

        const demandQuery = query(ref(database, 'demandas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeDemands = onValue(demandQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            protocol: value.protocol || `DEM-${id.slice(0, 6).toUpperCase()}`,
            title: value.title || 'Demanda',
            bairro: normalizeUpper(value.bairro || 'SEM BAIRRO'),
            status: value.status || 'received',
            timeline: value.timeline
              ? Object.entries(value.timeline)
                  .map(([timelineId, entry]) => ({ id: timelineId, ...entry }))
                  .sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt))
              : []
          }));
          list.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
          setDemands(list);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeDemands);

        const visitQuery = query(ref(database, 'visitas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeVisits = onValue(visitQuery, (snapshot) => {
          if (!active) return;
          const data = snapshot.val() || {};
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            titulo: value.titulo || value.nomeEleitor || 'Visita'
          }));
          setVisits(list);
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
                  cidade: normalizeUpper(value.cidade || 'SEM CIDADE')
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
                  cidade: normalizeUpper(value.cidade || 'SEM CIDADE')
                });
              });
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar demandas:', error);
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
    const critical = demands.filter((item) => item.priority === 'high').length;
    const completed = demands.filter((item) => item.status === 'completed').length;
    const waiting = demands.filter((item) => item.status === 'waiting').length;
    const todayKey = new Date().toISOString().split('T')[0];
    const today = demands.filter((item) => String(item.createdAt || '').startsWith(todayKey)).length;

    return {
      total: demands.length,
      critical,
      completed,
      waiting,
      today,
      completionRate: demands.length ? (completed / demands.length) * 100 : 0
    };
  }, [demands]);

  const saveDemand = async (payload, selectedId = null) => {
    if (!adminId) return;

    const linkedVoter = voters.find((item) => item.id === payload.voterId);
    const linkedAssessor = assessors.find((item) => item.id === payload.assessorId);
    const linkedVisit = visits.find((item) => item.id === payload.visitId);
    const nextStatus = payload.status || 'received';

    const timeline = [...(payload.timeline || [])];
    const lastTimelineStatus = timeline[timeline.length - 1]?.status;

    if (!timeline.length) {
      timeline.push({
        status: 'received',
        title: 'Protocolo criado',
        description: 'Demanda registrada no portal.',
        createdAt: new Date().toISOString(),
        actorName: linkedAssessor?.nome || payload.assessorResponsavel || 'Sistema'
      });
    }

    if (lastTimelineStatus !== nextStatus) {
      timeline.push({
        status: nextStatus,
        title: `Status alterado para ${DEMAND_STATUSES.find((item) => item.value === nextStatus)?.label || nextStatus}`,
        description: payload.timelineNote || '',
        createdAt: new Date().toISOString(),
        actorName: linkedAssessor?.nome || payload.assessorResponsavel || 'Sistema'
      });
    }

    const data = {
      protocol: payload.protocol || `DEM-${Date.now().toString().slice(-6)}`,
      title: payload.title,
      description: payload.description || '',
      category: payload.category || '',
      priority: payload.priority || 'medium',
      status: nextStatus,
      voterId: payload.voterId || '',
      voterName: linkedVoter?.nome || payload.voterName || '',
      bairro: linkedVoter?.bairro || payload.bairro || '',
      assessorId: payload.assessorId || '',
      assessorResponsavel: linkedAssessor?.nome || payload.assessorResponsavel || '',
      visitId: payload.visitId || '',
      visitTitle: linkedVisit?.titulo || '',
      response: payload.response || '',
      dueDate: payload.dueDate || '',
      timeline: ensureTimelineObject(timeline),
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId) {
      await update(ref(database, `demandas/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'demandas'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteDemand = async (id) => {
    await remove(ref(database, `demandas/${id}`));
  };

  return {
    loading,
    demands,
    voters,
    assessors,
    visits,
    stats,
    saveDemand,
    deleteDemand
  };
}
