import { equalTo, get, orderByChild, query, ref } from './firestoreDatabase';
import { database } from '../firebaseConfig';

const normalizeText = (value) => String(value || '').trim();

export const extractLimitNumber = (value) => {
  const match = normalizeText(value).match(/\d+/g);
  if (!match?.length) return null;
  return Number(match.join(''));
};

export const normalizePlanUsage = ({
  voterCount = 0,
  voterLimit = null
}) => {
  const percentage = voterLimit && voterLimit > 0
    ? Math.min(100, Math.round((voterCount / voterLimit) * 100))
    : 0;

  return {
    voterCount,
    voterLimit,
    remainingVoters: voterLimit && voterLimit > 0 ? Math.max(0, voterLimit - voterCount) : null,
    percentage,
    reached: voterLimit && voterLimit > 0 ? voterCount >= voterLimit : false
  };
};

export const loadScopedCampaignUsage = async (user) => {
  if (!user) {
    return {
      ownerIds: [],
      ownerEmails: [],
      voterCount: 0
    };
  }

  const ownerIds = new Set([user.uid]);
  const ownerEmails = new Set([user.email].filter(Boolean));

  const adminScopedAssessors = await get(query(ref(database, 'assessores'), orderByChild('adminId'), equalTo(user.uid)));
  if (adminScopedAssessors.exists()) {
    Object.values(adminScopedAssessors.val()).forEach((assessor) => {
      if (assessor.userId) ownerIds.add(assessor.userId);
      if (assessor.email) ownerEmails.add(assessor.email);
    });
  }

  const votersSnapshot = await get(ref(database, 'eleitores'));
  const allVoters = votersSnapshot.exists()
    ? Object.values(votersSnapshot.val())
    : [];

  const voterCount = allVoters.filter((entry) =>
    ownerIds.has(entry.creatorId) || ownerEmails.has(entry.creatorEmail)
  ).length;

  return {
    ownerIds: [...ownerIds],
    ownerEmails: [...ownerEmails],
    voterCount
  };
};

export const loadUserBillingProfile = async (user) => {
  if (!user) return null;

  const directSnapshot = await get(ref(database, `users/${user.uid}`));
  if (directSnapshot.exists()) {
    return directSnapshot.val();
  }

  const usersSnapshot = await get(query(ref(database, 'users'), orderByChild('userId'), equalTo(user.uid)));
  if (usersSnapshot.exists()) {
    const first = Object.values(usersSnapshot.val())[0];
    return first || null;
  }

  return null;
};

export const checkVoterPlanLimit = async (user, incomingCount = 1) => {
  const [billingProfile, usage] = await Promise.all([
    loadUserBillingProfile(user),
    loadScopedCampaignUsage(user)
  ]);

  const voterLimit = extractLimitNumber(billingProfile?.limiteEleitores);
  const currentUsage = normalizePlanUsage({
    voterCount: usage.voterCount,
    voterLimit
  });

  const nextCount = usage.voterCount + incomingCount;
  const allowed = voterLimit == null || voterLimit <= 0 || nextCount <= voterLimit;

  return {
    allowed,
    billingProfile,
    usage: currentUsage,
    incomingCount,
    nextCount,
    message: allowed
      ? null
      : `Seu plano atingiu o limite de ${voterLimit} cadastro(s). Faça upgrade para continuar crescendo a base.`
  };
};

export const getPrimaryCardId = (profileData, subscription) => {
  return (
    subscription?.card?.id ||
    subscription?.card_id ||
    subscription?.current_transaction?.card?.id ||
    profileData?.cards?.[0]?.id ||
    null
  );
};

export const formatInvoiceStatus = (status) => {
  const map = {
    paid: 'Pago',
    pending: 'Pendente',
    canceled: 'Cancelada',
    scheduled: 'Agendada',
    failed: 'Falhou',
    active: 'Ativa',
    future: 'Futura',
    canceled_subscription: 'Cancelada'
  };
  return map[status] || status || 'Indefinido';
};

export const formatSubscriptionStatus = (status) => {
  const map = {
    active: 'Ativa',
    paid: 'Ativa',
    future: 'Agendada',
    canceled: 'Cancelada',
    pending_payment: 'Pagamento pendente'
  };
  return map[status] || status || 'Indefinido';
};

export const comparePlanAmount = (currentAmount, targetAmount) => {
  if (typeof currentAmount !== 'number' || typeof targetAmount !== 'number') return 'change';
  if (targetAmount > currentAmount) return 'upgrade';
  if (targetAmount < currentAmount) return 'downgrade';
  return 'same';
};
