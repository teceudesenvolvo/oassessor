import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, query, ref } from 'firebase/database';
import { database } from '../firebaseConfig';

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const SUPPORT_STAGES = ['simpatizante', 'apoiador', 'multiplicador', 'voto confirmado'];

export function useReportsCenter(user) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    voters: [],
    tasks: [],
    visits: [],
    demands: [],
    researches: [],
    assessors: []
  });

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

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessors = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({
              id,
              ...value,
              nome: value.nome || value.name || value.email || 'Assessor'
            }))
          : [];

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessors.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const current = {
          voters: [],
          tasks: [],
          visits: [],
          demands: [],
          researches: [],
          assessors
        };
        const votersMap = new Map();

        const sync = () => {
          if (!active) return;
          setData({
            ...current,
            voters: [...votersMap.values()]
          });
          setLoading(false);
        };

        const votersRef = ref(database, 'eleitores');
        ownerIds.forEach((ownerId) => {
          const voterQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(voterQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorId === ownerId) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || ''),
                  stage: normalizeText(value.funnelStage || value.etapa || value.tipoApoio || value.statusEleitoral)
                });
              });
            }
            sync();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const voterQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(voterQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorEmail === email) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  bairro: normalizeUpper(value.bairro || ''),
                  stage: normalizeText(value.funnelStage || value.etapa || value.tipoApoio || value.statusEleitoral)
                });
              });
            }
            sync();
          });
          unsubscribes.push(unsubscribe);
        });

        unsubscribes.push(
          onValue(query(ref(database, 'tarefas'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            current.tasks = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value, tipo: value.tipo || 'general' }))
              : [];
            sync();
          })
        );

        unsubscribes.push(
          onValue(query(ref(database, 'visitas'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            current.visits = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })) : [];
            sync();
          })
        );

        unsubscribes.push(
          onValue(query(ref(database, 'demandas'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            current.demands = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })) : [];
            sync();
          })
        );

        unsubscribes.push(
          onValue(query(ref(database, 'pesquisas'), orderByChild('adminId'), equalTo(effectiveAdminId)), (snapshot) => {
            current.researches = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, value]) => ({
                  id,
                  ...value,
                  answers: value.answers ? Object.values(value.answers) : []
                }))
              : [];
            sync();
          })
        );
      } catch (error) {
        console.error('Erro ao carregar central de relatórios:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const summary = useMemo(() => {
    const supporters = data.voters.filter((item) => SUPPORT_STAGES.includes(item.stage)).length;
    const completedVisits = data.visits.filter((item) => item.status === 'completed').length;
    const pendingDemands = data.demands.filter((item) => item.status !== 'completed').length;
    const totalAnswers = data.researches.reduce((sum, item) => sum + item.answers.length, 0);
    return {
      voters: data.voters.length,
      supporters,
      tasks: data.tasks.length,
      visits: data.visits.length,
      completedVisits,
      demands: data.demands.length,
      pendingDemands,
      researches: data.researches.length,
      totalAnswers
    };
  }, [data]);

  const chartData = useMemo(
    () => [
      { label: 'Eleitores', total: data.voters.length },
      { label: 'Tarefas', total: data.tasks.length },
      { label: 'Visitas', total: data.visits.length },
      { label: 'Demandas', total: data.demands.length },
      { label: 'Pesquisas', total: data.researches.length }
    ],
    [data]
  );

  const neighborhoodReport = useMemo(() => {
    const map = new Map();
    data.voters.forEach((voter) => {
      const key = voter.bairro || 'SEM BAIRRO';
      if (!map.has(key)) map.set(key, { bairro: key, eleitores: 0, apoiadores: 0 });
      const row = map.get(key);
      row.eleitores += 1;
      if (SUPPORT_STAGES.includes(voter.stage)) row.apoiadores += 1;
    });
    return [...map.values()].sort((a, b) => b.eleitores - a.eleitores);
  }, [data.voters]);

  return {
    loading,
    data,
    summary,
    chartData,
    neighborhoodReport
  };
}
