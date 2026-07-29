import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

export const RESEARCH_TYPES = [
  { value: 'intention', label: 'Intenção' },
  { value: 'satisfaction', label: 'Satisfação' },
  { value: 'priorities', label: 'Prioridades' },
  { value: 'evaluation', label: 'Avaliação' }
];

export function useResearchCenter(user) {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [researches, setResearches] = useState([]);
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

        const votersMap = new Map();
        const syncVoters = () => {
          if (!active) return;
          setVoters([...votersMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
        };

        const votersRef = ref(database, 'eleitores');
        ownerIds.forEach((ownerId) => {
          const votersQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorId === ownerId) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  nome: value.nome || 'Eleitor',
                  bairro: normalizeUpper(value.bairro || ''),
                  creatorId: value.creatorId,
                  creatorEmail: value.creatorEmail
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
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorEmail === email) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                votersMap.set(id, {
                  id,
                  ...value,
                  nome: value.nome || 'Eleitor',
                  bairro: normalizeUpper(value.bairro || ''),
                  creatorId: value.creatorId,
                  creatorEmail: value.creatorEmail
                });
              });
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });

        const researchQuery = query(ref(database, 'pesquisas'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeResearches = onValue(researchQuery, (snapshot) => {
          if (!active) return;
          const list = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, value]) => ({
                id,
                ...value,
                title: value.title || 'Pesquisa',
                type: value.type || 'intention',
                bairro: normalizeUpper(value.bairro || ''),
                answers: value.answers ? Object.entries(value.answers).map(([answerId, answer]) => ({ id: answerId, ...answer })) : []
              }))
            : [];
          setResearches(list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
          setLoading(false);
        });
        unsubscribes.push(unsubscribeResearches);
      } catch (error) {
        console.error('Erro ao carregar pesquisas:', error);
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
    const totalAnswers = researches.reduce((sum, item) => sum + item.answers.length, 0);
    return {
      total: researches.length,
      totalAnswers,
      intention: researches.filter((item) => item.type === 'intention').length,
      satisfaction: researches.filter((item) => item.type === 'satisfaction').length,
      priorities: researches.filter((item) => item.type === 'priorities').length,
      evaluation: researches.filter((item) => item.type === 'evaluation').length
    };
  }, [researches]);

  const aggregatedOptions = useMemo(() => {
    const map = new Map();
    researches.forEach((research) => {
      research.answers.forEach((answer) => {
        const key = `${research.type}:${answer.option || 'Sem resposta'}`;
        if (!map.has(key)) {
          map.set(key, {
            type: research.type,
            option: answer.option || 'Sem resposta',
            total: 0
          });
        }
        map.get(key).total += 1;
      });
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [researches]);

  const saveResearch = async (payload, selectedId = null) => {
    if (!adminId) return;

    const assessor = assessors.find((item) => item.id === payload.assessorId);
    const answersObject = {};
    (payload.answers || []).forEach((answer) => {
      answersObject[answer.id || push(ref(database, 'tmp')).key] = {
        voterId: answer.voterId || '',
        voterName: answer.voterName || '',
        option: answer.option || '',
        note: answer.note || '',
        bairro: answer.bairro || ''
      };
    });

    const data = {
      title: payload.title,
      type: payload.type || 'intention',
      bairro: payload.bairro || '',
      assessorId: payload.assessorId || '',
      assessorResponsavel: assessor?.nome || payload.assessorResponsavel || '',
      description: payload.description || '',
      answers: answersObject,
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (selectedId) {
      await update(ref(database, `pesquisas/${selectedId}`), data);
      return selectedId;
    }

    const newRef = push(ref(database, 'pesquisas'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const deleteResearch = async (id) => {
    await remove(ref(database, `pesquisas/${id}`));
  };

  return {
    loading,
    researches,
    voters,
    assessors,
    stats,
    aggregatedOptions,
    saveResearch,
    deleteResearch
  };
}
