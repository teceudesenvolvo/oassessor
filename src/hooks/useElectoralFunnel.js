import { useEffect, useMemo, useState } from 'react';
import { equalTo, get, onValue, orderByChild, push, query, ref, set, update } from 'firebase/database';
import { database } from '../firebaseConfig';

export const FUNNEL_STAGES = [
  'Não contatado',
  'Contatado',
  'Indeciso',
  'Simpatizante',
  'Apoiador',
  'Voluntário',
  'Multiplicador',
  'Voto confirmado',
  'Não apoia',
  'Não localizado'
];

const DEFAULT_FILTERS = {
  search: '',
  stage: 'all',
  neighborhood: 'all',
  city: 'all',
  assessor: 'all',
  nextContact: 'all'
};

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

const sameDay = (first, second) =>
  first &&
  second &&
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const resolveOwner = (user, assessors, voter, adminId) => {
  const matchedAssessor = assessors.find((assessor) =>
    assessor.userId === voter.creatorId || assessor.email === voter.creatorEmail
  );

  if (voter.creatorId === adminId || voter.creatorEmail === user.email) {
    return {
      key: adminId,
      label: 'Administrador'
    };
  }

  return {
    key: voter.creatorId || voter.creatorEmail || matchedAssessor?.id || 'unknown',
    label: matchedAssessor?.nome || voter.creatorEmail || 'Equipe'
  };
};

const mapVoter = (user, assessors, adminId, id, voter) => {
  const owner = resolveOwner(user, assessors, voter, adminId);
  const nextContactDate = parseDate(voter.funnelNextContact || voter.proximoContato || voter.nextContactAt);
  const history = voter.funnelHistory ? Object.entries(voter.funnelHistory).map(([key, value]) => ({ id: key, ...value })) : [];

  return {
    id,
    ...voter,
    funnelStage: voter.funnelStage || voter.etapa || 'Não contatado',
    funnelOwner: voter.funnelOwner || voter.creatorName || owner.label,
    funnelNotes: voter.funnelNotes || voter.observacoes || '',
    funnelUpdatedAt: voter.funnelUpdatedAt || voter.updatedAt || voter.createdAt || null,
    funnelNextContact: voter.funnelNextContact || voter.proximoContato || '',
    nextContactDate,
    history: history.sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0)),
    bairroLabel: normalizeUpper(voter.bairro || 'Sem bairro'),
    cidadeLabel: normalizeUpper(voter.cidade || 'Sem cidade'),
    ownerKey: owner.key,
    ownerLabel: owner.label
  };
};

export function useElectoralFunnel(user) {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [voters, setVoters] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const unsubscribes = [];

    const fetchFunnel = async () => {
      try {
        setLoading(true);

        let currentUserType = null;
        let adminId = user.uid;

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
          if (userData.adminId) adminId = userData.adminId;
        }

        const effectiveAdminId = currentUserType === 'admin' ? user.uid : adminId;
        const assessoresRef = ref(database, 'assessores');
        const assessorsSnapshot = await get(query(assessoresRef, orderByChild('adminId'), equalTo(effectiveAdminId)));
        const assessorsList = assessorsSnapshot.exists()
          ? Object.entries(assessorsSnapshot.val()).map(([id, value]) => ({ id, ...value }))
          : [];

        if (!active) return;
        setUserType(currentUserType || 'assessor');
        setAssessors(assessorsList);

        const ownerIds = new Set([effectiveAdminId]);
        const ownerEmails = new Set([user.email].filter(Boolean));

        assessorsList.forEach((assessor) => {
          if (assessor.userId) ownerIds.add(assessor.userId);
          if (assessor.email) ownerEmails.add(assessor.email);
        });

        const votersRef = ref(database, 'eleitores');
        const collectionMap = new Map();

        const syncCollection = () => {
          if (!active) return;
          const mapped = [...collectionMap.entries()].map(([id, value]) =>
            mapVoter(user, assessorsList, effectiveAdminId, id, value)
          );
          setVoters(mapped);
          setLoading(false);
        };

        ownerIds.forEach((ownerId) => {
          const ownerQuery = query(votersRef, orderByChild('creatorId'), equalTo(ownerId));
          const unsubscribe = onValue(ownerQuery, (snapshot) => {
            [...collectionMap.keys()].forEach((key) => {
              if (collectionMap.get(key)?.creatorId === ownerId) collectionMap.delete(key);
            });

            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                collectionMap.set(id, value);
              });
            }

            syncCollection();
          });
          unsubscribes.push(unsubscribe);
        });

        ownerEmails.forEach((email) => {
          const ownerQuery = query(votersRef, orderByChild('creatorEmail'), equalTo(email));
          const unsubscribe = onValue(ownerQuery, (snapshot) => {
            [...collectionMap.keys()].forEach((key) => {
              if (collectionMap.get(key)?.creatorEmail === email) collectionMap.delete(key);
            });

            if (snapshot.exists()) {
              Object.entries(snapshot.val()).forEach(([id, value]) => {
                collectionMap.set(id, value);
              });
            }

            syncCollection();
          });
          unsubscribes.push(unsubscribe);
        });
      } catch (error) {
        console.error('Erro ao carregar funil eleitoral:', error);
        if (active) setLoading(false);
      }
    };

    fetchFunnel();

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const filteredVoters = useMemo(() => {
    const today = new Date();

    return voters.filter((voter) => {
      const search = normalizeText(filters.search);
      const matchesSearch =
        !search ||
        normalizeText(voter.nome).includes(search) ||
        normalizeText(voter.email).includes(search) ||
        String(voter.telefone || '').includes(search);

      const matchesStage = filters.stage === 'all' || voter.funnelStage === filters.stage;
      const matchesNeighborhood = filters.neighborhood === 'all' || voter.bairroLabel === filters.neighborhood;
      const matchesCity = filters.city === 'all' || voter.cidadeLabel === filters.city;
      const matchesAssessor = filters.assessor === 'all' || voter.ownerKey === filters.assessor;

      let matchesNextContact = true;
      if (filters.nextContact === 'today') {
        matchesNextContact = sameDay(voter.nextContactDate, today);
      } else if (filters.nextContact === 'overdue') {
        matchesNextContact = voter.nextContactDate && voter.nextContactDate < today && !sameDay(voter.nextContactDate, today);
      } else if (filters.nextContact === 'scheduled') {
        matchesNextContact = !!voter.nextContactDate;
      }

      return (
        matchesSearch &&
        matchesStage &&
        matchesNeighborhood &&
        matchesCity &&
        matchesAssessor &&
        matchesNextContact
      );
    });
  }, [filters, voters]);

  const groupedByStage = useMemo(
    () =>
      FUNNEL_STAGES.reduce((acc, stage) => {
        acc[stage] = filteredVoters
          .filter((voter) => voter.funnelStage === stage)
          .sort((a, b) => new Date(b.funnelUpdatedAt || 0) - new Date(a.funnelUpdatedAt || 0));
        return acc;
      }, {}),
    [filteredVoters]
  );

  const options = useMemo(
    () => ({
      neighborhoods: [...new Set(voters.map((voter) => voter.bairroLabel).filter(Boolean))].sort(),
      cities: [...new Set(voters.map((voter) => voter.cidadeLabel).filter(Boolean))].sort(),
      assessors: [...new Map(
        voters
          .filter((voter) => voter.ownerKey)
          .map((voter) => [voter.ownerKey, { value: voter.ownerKey, label: voter.ownerLabel }])
      ).values()]
    }),
    [voters]
  );

  const updateVoterStage = async ({ voterId, toStage, notes, nextContact, responsible }) => {
    const voter = voters.find((item) => item.id === voterId);
    if (!voter) return;

    const voterRef = ref(database, `eleitores/${voterId}`);
    const historyRef = push(ref(database, `eleitores/${voterId}/funnelHistory`));
    const changedAt = new Date().toISOString();
    const safeNotes = notes ?? voter.funnelNotes ?? '';
    const safeResponsible = responsible || voter.funnelOwner || user?.displayName || user?.email || 'Equipe';

    await Promise.all([
      update(voterRef, {
        funnelStage: toStage,
        funnelNotes: safeNotes,
        funnelNextContact: nextContact || '',
        funnelOwner: safeResponsible,
        funnelUpdatedAt: changedAt,
        etapa: toStage,
        proximoContato: nextContact || '',
        updatedAt: changedAt
      }),
      set(historyRef, {
        fromStage: voter.funnelStage || 'Não contatado',
        toStage,
        notes: safeNotes,
        nextContact: nextContact || '',
        responsible: safeResponsible,
        changedAt
      })
    ]);
  };

  return {
    loading,
    userType,
    voters,
    filteredVoters,
    groupedByStage,
    filters,
    setFilters,
    options,
    assessors,
    updateVoterStage
  };
}
