import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';

const CONFIRMED_STAGES = ['voto confirmado', 'confirmado'];
const PROBABLE_STAGES = ['simpatizante', 'apoiador', 'voluntario', 'voluntário', 'multiplicador', 'lideranca', 'liderança'];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

const parseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    const br = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!Number.isNaN(br.getTime())) return br;
  }
  return null;
};

const formatChartLabel = (date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const matchesGroup = (voter, stages) => {
  const candidates = [
    voter.funnelStage,
    voter.etapa,
    voter.statusEleitoral,
    voter.classificacao,
    voter.tipoApoio
  ].map(normalizeText);

  return candidates.some((candidate) => stages.includes(candidate));
};

const daysBetween = (from, to) => {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

export function useVictoryPath(user) {
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [metaConfig, setMetaConfig] = useState({
    id: null,
    cargo: '',
    municipio: '',
    estado: '',
    metaMinima: '',
    metaPrincipal: '',
    metaSegura: '',
    dataEleicao: ''
  });
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

        const metaRef = query(ref(database, 'metasEleitorais'), orderByChild('adminId'), equalTo(effectiveAdminId));
        const unsubscribeMeta = onValue(metaRef, (snapshot) => {
          if (!active) return;
          if (!snapshot.exists()) {
            setMetaConfig({
              id: null,
              cargo: '',
              municipio: '',
              estado: '',
              metaMinima: '',
              metaPrincipal: '',
              metaSegura: '',
              dataEleicao: ''
            });
            return;
          }

          const [id, value] = Object.entries(snapshot.val())[0];
          setMetaConfig({
            id,
            cargo: value.cargo || '',
            municipio: value.municipio || '',
            estado: value.estado || '',
            metaMinima: value.metaMinima || '',
            metaPrincipal: value.metaPrincipal || '',
            metaSegura: value.metaSegura || '',
            dataEleicao: value.dataEleicao || ''
          });
        });
        unsubscribes.push(unsubscribeMeta);

        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessorsList = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({
              id,
              ...value,
              nome: value.nome || value.name || value.email || 'Assessor',
              equipeNome: normalizeUpper(value.equipe || value.cargo || 'Equipe principal')
            }))
          : [];
        if (!active) return;
        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));
        assessorsList.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const votersMap = new Map();
        const syncVoters = () => {
          if (!active) return;
          const mapped = [...votersMap.entries()].map(([id, value]) => {
            const matchedAssessor = assessorsList.find(
              (assessor) => assessor.userId === value.creatorId || assessor.email === value.creatorEmail
            );
            return {
              id,
              ...value,
              createdAtDate: parseDate(value.createdAt),
              updatedAtDate: parseDate(value.updatedAt),
              neighborhood: normalizeUpper(value.bairro || 'Sem bairro'),
              assessorName:
                value.creatorId === effectiveAdminId
                  ? 'Administrador'
                  : matchedAssessor?.nome || value.creatorEmail || 'Equipe',
              teamName: matchedAssessor?.equipeNome || normalizeUpper(value.equipe || 'Equipe principal')
            };
          });
          setVoters(mapped);
          setLoading(false);
        };

        const votersRef = ref(database, 'eleitores');
        ownerIds.forEach((ownerId) => {
          const votersQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(votersQuery, (snapshot) => {
            [...votersMap.keys()].forEach((key) => {
              if (votersMap.get(key)?.creatorId === ownerId) votersMap.delete(key);
            });
            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => votersMap.set(id, value));
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
              Object.entries(snapshot.val()).forEach(([id, value]) => votersMap.set(id, value));
            }
            syncVoters();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar Caminho para a Vitória:', error);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const saveMeta = async (payload) => {
    if (!adminId) return;

    const data = {
      ...payload,
      adminId,
      updatedAt: new Date().toISOString()
    };

    if (metaConfig.id) {
      await update(ref(database, `metasEleitorais/${metaConfig.id}`), data);
      return metaConfig.id;
    }

    const newRef = push(ref(database, 'metasEleitorais'));
    await set(newRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return newRef.key;
  };

  const analytics = useMemo(() => {
    const confirmedVotes = voters.filter((voter) => matchesGroup(voter, CONFIRMED_STAGES)).length;
    const probableVotes = voters.filter((voter) => matchesGroup(voter, PROBABLE_STAGES)).length;
    const minimumGoal = Number(metaConfig.metaMinima || 0);
    const mainGoal = Number(metaConfig.metaPrincipal || 0);
    const safeGoal = Number(metaConfig.metaSegura || 0);
    const electionDate = parseDate(metaConfig.dataEleicao);
    const today = new Date();

    const referenceGoal = mainGoal || safeGoal || minimumGoal || 0;
    const percentReached = referenceGoal ? Math.min(100, (confirmedVotes / referenceGoal) * 100) : 0;
    const votesNeeded = Math.max(0, referenceGoal - confirmedVotes);

    const campaignStartCandidates = voters
      .map((voter) => voter.createdAtDate)
      .filter(Boolean)
      .sort((a, b) => a - b);

    const campaignStart = campaignStartCandidates[0] || today;
    const daysRunning = daysBetween(campaignStart, today);
    const dailyRhythm = confirmedVotes / daysRunning;
    const daysRemaining = electionDate ? Math.max(0, daysBetween(today, electionDate)) : 0;
    const projectedVotes = Math.round(confirmedVotes + dailyRhythm * daysRemaining);

    const chartMap = voters.reduce((acc, voter) => {
      if (!voter.createdAtDate) return acc;
      const key = voter.createdAtDate.toISOString().split('T')[0];
      if (!acc[key]) {
        acc[key] = {
          label: formatChartLabel(voter.createdAtDate),
          confirmados: 0,
          provaveis: 0
        };
      }

      if (matchesGroup(voter, CONFIRMED_STAGES)) acc[key].confirmados += 1;
      if (matchesGroup(voter, PROBABLE_STAGES)) acc[key].provaveis += 1;
      return acc;
    }, {});

    const chartData = Object.entries(chartMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([, value]) => value);

    const rankingByTeam = Object.values(
      voters.reduce((acc, voter) => {
        const key = voter.teamName || 'Equipe principal';
        if (!acc[key]) acc[key] = { name: key, confirmed: 0, probable: 0, total: 0 };
        acc[key].total += 1;
        if (matchesGroup(voter, CONFIRMED_STAGES)) acc[key].confirmed += 1;
        if (matchesGroup(voter, PROBABLE_STAGES)) acc[key].probable += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.confirmed - a.confirmed || b.probable - a.probable)
      .slice(0, 6);

    const rankingByLeadership = Object.values(
      voters.reduce((acc, voter) => {
        const key = voter.assessorName || 'Equipe';
        if (!acc[key]) acc[key] = { name: key, confirmed: 0, probable: 0, total: 0 };
        acc[key].total += 1;
        if (matchesGroup(voter, CONFIRMED_STAGES)) acc[key].confirmed += 1;
        if (matchesGroup(voter, PROBABLE_STAGES)) acc[key].probable += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.confirmed - a.confirmed || b.probable - a.probable)
      .slice(0, 6);

    const rankingByNeighborhood = Object.values(
      voters.reduce((acc, voter) => {
        const key = voter.neighborhood || 'Sem bairro';
        if (!acc[key]) acc[key] = { name: key, confirmed: 0, probable: 0, total: 0 };
        acc[key].total += 1;
        if (matchesGroup(voter, CONFIRMED_STAGES)) acc[key].confirmed += 1;
        if (matchesGroup(voter, PROBABLE_STAGES)) acc[key].probable += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.confirmed - a.confirmed || b.probable - a.probable)
      .slice(0, 6);

    return {
      confirmedVotes,
      probableVotes,
      minimumGoal,
      mainGoal,
      safeGoal,
      percentReached,
      votesNeeded,
      dailyRhythm,
      projectedVotes,
      daysRemaining,
      chartData,
      rankingByTeam,
      rankingByLeadership,
      rankingByNeighborhood
    };
  }, [metaConfig, voters]);

  return {
    loading,
    userType,
    metaConfig,
    setMetaConfig,
    saveMeta,
    analytics
  };
}
