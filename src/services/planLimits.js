import { equalTo, get, orderByChild, query, ref } from './firestoreDatabase';
import { database } from '../firebaseConfig';

const normalizeText = (value) => String(value || '').trim();
const BLOCK_GRACE_DAYS = 5;

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

export const loadScopedCampaignUsageByOwner = async ({ ownerId, ownerEmail }) => {
  if (!ownerId && !ownerEmail) {
    return {
      ownerIds: [],
      ownerEmails: [],
      voterCount: 0,
      assessorCount: 0,
      teamSize: 0
    };
  }

  const ownerIds = new Set([ownerId].filter(Boolean));
  const ownerEmails = new Set([ownerEmail].filter(Boolean));

  const adminScopedAssessors = ownerId
    ? await get(query(ref(database, 'assessores'), orderByChild('adminId'), equalTo(ownerId)))
    : { exists: () => false };

  const assessors = adminScopedAssessors.exists()
    ? Object.values(adminScopedAssessors.val() || {})
    : [];

  assessors.forEach((assessor) => {
    if (assessor.userId) ownerIds.add(assessor.userId);
    if (assessor.email) ownerEmails.add(assessor.email);
  });

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
    voterCount,
    assessorCount: assessors.length,
    teamSize: 1 + assessors.length
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

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const evaluateAccountBilling = (profile = {}, plan = null, now = new Date()) => {
  const trialDays = Number(profile.trialDays ?? plan?.trialDays ?? 0);
  const graceDays = Number(profile.graceDays ?? plan?.graceDays ?? BLOCK_GRACE_DAYS);
  const isFreePlan = Boolean(profile.isFreePlan ?? plan?.isFree ?? false);
  const billingModel = String(profile.billingModel || plan?.billingModel || '').toLowerCase();
  const subscriptionStatus = String(profile.subscriptionStatus || '').toLowerCase();
  const billingStatus = String(profile.billingStatus || subscriptionStatus || (isFreePlan ? 'free' : 'active')).toLowerCase();
  const trialEndsAt = parseDate(profile.trialEndsAt);
  const nextBillingDate = parseDate(profile.nextBillingDate);
  const accessExpiresAt = parseDate(profile.accessExpiresAt);
  const delinquentSince = parseDate(profile.delinquentSince || profile.lastInvoiceDueAt);
  const effectiveNow = parseDate(now) || new Date();

  const msPerDay = 86400000;
  const trialActive = Boolean(trialEndsAt && trialEndsAt.getTime() >= effectiveNow.getTime());
  const overdueBaseDate = delinquentSince || nextBillingDate;
  const overdueDays = overdueBaseDate
    ? Math.max(0, Math.floor((effectiveNow.getTime() - overdueBaseDate.getTime()) / msPerDay))
    : 0;
  const blockedByStatus = ['blocked', 'past_due_blocked'].includes(billingStatus);
  const pendingByStatus = ['pending_payment', 'pending', 'failed', 'past_due', 'overdue', 'unpaid'].includes(billingStatus);
  const oneTimeExpired = billingModel === 'one_time' && accessExpiresAt && accessExpiresAt.getTime() < effectiveNow.getTime();
  const blocked = !isFreePlan && !trialActive && (oneTimeExpired || blockedByStatus || (pendingByStatus && overdueDays > graceDays));

  return {
    isFreePlan,
    billingModel,
    trialDays,
    graceDays,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
    nextBillingDate: nextBillingDate ? nextBillingDate.toISOString() : null,
    accessExpiresAt: accessExpiresAt ? accessExpiresAt.toISOString() : null,
    delinquentSince: overdueBaseDate ? overdueBaseDate.toISOString() : null,
    trialActive,
    overdueDays,
    blocked,
    accessStatus: blocked ? 'blocked' : trialActive ? 'trialing' : isFreePlan ? 'free' : 'active',
    billingStatusLabel: oneTimeExpired ? 'Plano expirado' : blocked ? 'Bloqueado' : trialActive ? 'Em teste' : isFreePlan ? 'Plano gratuito' : formatSubscriptionStatus(profile.subscriptionStatus || billingStatus)
  };
};
