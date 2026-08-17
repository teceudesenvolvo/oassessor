import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, ref, remove, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';
import { fetchManagedPlans } from '../services/appPlansService';
import { evaluateAccountBilling, extractLimitNumber, loadScopedCampaignUsageByOwner } from '../services/planLimits';
import { inferUserRole } from '../utils/userRoles';

const CREATE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/createPagarmePlan';
const UPDATE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/updatePagarmePlan';
const UPDATE_PLAN_ITEM_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/updatePagarmePlanItem';
const CHANGE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/changeSubscriptionPlan';
const SYNC_SUBSCRIPTION_HEALTH_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/syncSubscriptionHealth';
const DELETE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/deletePagarmePlan';
const FEATURE_LIMIT_KEYS = [
  'leaderships',
  'volunteers',
  'visits',
  'demands',
  'events',
  'communication',
  'territory',
  'research',
  'team',
  'agenda'
];

const formatCurrency = (amount = 0) =>
  Number(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parsePlanAmountInput = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  const raw = String(value || '').trim();
  if (!raw) return NaN;

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : NaN;
};

const isGatewayUnavailableError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes('load failed') ||
    message.includes('failed to fetch') ||
    message.includes('404')
  );
};

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    const details = result.details
      ? ` Detalhes: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`
      : '';
    throw new Error((result.error || result.message || `Falha ao executar ${url}`) + details);
  }
  return result;
};

const normalizeCollection = (snapshot) =>
  snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })) : [];

const normalizeUser = (entry) => {
  const planLimit = extractLimitNumber(entry.limiteEleitores);
  return {
    ...entry,
    documentId: entry.id,
    authUserId: entry.userId || entry.id,
    name: entry.nome || entry.name || entry.email || 'Usuário',
    role: inferUserRole(entry, 'assessor'),
    status: entry.status || 'Ativo',
    adminId: entry.adminId || null,
    planId: entry.planId || null,
    planName: entry.nomePlano || entry.planName || null,
    planLimit,
    email: entry.email || '',
    phone: entry.telefone || entry.phone || '',
    createdAt: entry.createdAt || entry.updatedAt || null,
    billingStatus: entry.billingStatus || '',
    nextBillingDate: entry.nextBillingDate || null,
    trialDays: Number(entry.trialDays || 0),
    graceDays: Number(entry.graceDays || 5),
    trialEndsAt: entry.trialEndsAt || null,
    delinquentSince: entry.delinquentSince || entry.lastInvoiceDueAt || null,
    isFreePlan: Boolean(entry.isFreePlan),
    accessBlockedAt: entry.accessBlockedAt || null
  };
};

export function useSystemCenter(user) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [supportFaqs, setSupportFaqs] = useState([]);
  const [supportChannels, setSupportChannels] = useState({
    whatsapp: '5585997363433',
    email: 'contatos@blutecnologias.com.br',
    whatsappLabel: 'Atendimento consultivo com um toque.',
    emailLabel: 'Fale com nosso time sobre operação, planos e implantação.'
  });

  const canAccess = String(user?.email || '').toLowerCase() === 'leo@gmail.com';

  const reload = useCallback(async () => {
    if (!user || !canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [usersSnapshot, plansResponse, assessorsSnapshot] = await Promise.all([
        get(ref(database, 'users')),
        fetchManagedPlans({ includeHidden: true }),
        get(ref(database, 'assessores'))
      ]);

      const rawUsers = normalizeCollection(usersSnapshot).map(normalizeUser);
      const assessorsList = normalizeCollection(assessorsSnapshot);
      const assessorKeys = new Set(
        assessorsList.flatMap((entry) => [
          String(entry.id || '').toLowerCase(),
          String(entry.userId || '').toLowerCase(),
          String(entry.email || '').toLowerCase()
        ].filter(Boolean))
      );

      const ownerCandidates = rawUsers.filter((entry) => {
        const keyId = String(entry.documentId || '').toLowerCase();
        const keyAuth = String(entry.authUserId || '').toLowerCase();
        const keyEmail = String(entry.email || '').toLowerCase();
        const isTeamParticipant =
          assessorKeys.has(keyId) ||
          assessorKeys.has(keyAuth) ||
          assessorKeys.has(keyEmail) ||
          (entry.adminId && entry.adminId !== entry.authUserId);
        const isAdministrator = String(entry.role || '').toLowerCase() === 'admin';

        return isAdministrator && !isTeamParticipant;
      });

      const usageByOwner = await Promise.all(
        ownerCandidates.map(async (entry) => {
          const usage = await loadScopedCampaignUsageByOwner({
            ownerId: entry.authUserId,
            ownerEmail: entry.email
          }).catch(() => ({
            voterCount: 0,
            assessorCount: 0,
            teamSize: 1
          }));

          const matchingPlan = plansResponse.find((plan) => plan.id === entry.planId) || null;
          const billing = evaluateAccountBilling(entry, matchingPlan);

          return {
            ...entry,
            voterUsage: usage.voterCount,
            assessorCount: usage.assessorCount,
            teamSize: usage.teamSize,
            accountAccessStatus: billing.accessStatus,
            billingLabel: billing.billingStatusLabel,
            overdueDays: billing.overdueDays,
            blocked: billing.blocked,
            trialActive: billing.trialActive,
            effectiveTrialDays: billing.trialDays,
            effectiveGraceDays: billing.graceDays,
            nextBillingDate: billing.nextBillingDate || entry.nextBillingDate || null,
            trialEndsAt: billing.trialEndsAt || entry.trialEndsAt || null,
            delinquentSince: billing.delinquentSince || entry.delinquentSince || null,
            isFreePlan: billing.isFreePlan
          };
        })
      );

      setAssessors(assessorsList);
      setUsers(usageByOwner);
      setPlans(plansResponse || []);

      const [faqSnapshot, channelsSnapshot] = await Promise.all([
        get(ref(database, 'supportFaqs')),
        get(ref(database, 'supportChannels/public'))
      ]);

      setSupportFaqs(
        normalizeCollection(faqSnapshot)
          .filter((item) => item.active !== false)
          .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      );

      if (channelsSnapshot.exists()) {
        setSupportChannels((prev) => ({ ...prev, ...(channelsSnapshot.val() || {}) }));
      }
    } catch (error) {
      console.error('Erro ao carregar central do sistema:', error);
    } finally {
      setLoading(false);
    }
  }, [canAccess, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const customers = useMemo(
    () =>
      users.filter((entry) => entry.subscriptionId || entry.planId || entry.pagarmeCustomerId || entry.isFreePlan),
    [users]
  );

  const summary = useMemo(() => {
    const hiddenPlans = plans.filter((plan) => plan.visible === false).length;
    const activePlans = plans.filter((plan) => plan.visible !== false).length;
    const activeCustomers = customers.filter((entry) => !entry.blocked).length;
    const mrr = customers.reduce((accumulator, entry) => {
      const plan = plans.find((item) => item.id === entry.planId);
      return accumulator + Number(plan?.amount || 0);
    }, 0);

    return {
      totalUsers: users.length,
      activeCustomers,
      totalSales: customers.filter((entry) => entry.subscriptionId).length,
      activePlans,
      hiddenPlans,
      mrr: formatCurrency(mrr / 100),
      blockedAccounts: customers.filter((entry) => entry.blocked).length,
      trialAccounts: customers.filter((entry) => entry.trialActive).length
    };
  }, [customers, plans, users]);

  const sales = useMemo(
    () =>
      [...customers]
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 12)
        .map((entry) => ({
          id: entry.id,
          customerName: entry.name,
          email: entry.email,
          planName: entry.planName || plans.find((item) => item.id === entry.planId)?.title || 'Sem plano',
          amount: formatCurrency((plans.find((item) => item.id === entry.planId)?.amount || 0) / 100),
          status: entry.billingLabel || entry.subscriptionStatus || entry.status || 'Ativo',
          createdAt: entry.createdAt
        })),
    [customers, plans]
  );

  const planDistribution = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        customers: customers.filter((entry) => entry.planId === plan.id).length
      })),
    [customers, plans]
  );

  const persistPlanOverride = useCallback(async (planId, payload) => {
    await update(ref(database, `system_plan_overrides/${planId}`), {
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || null
    });
  }, [user]);

  const togglePlanVisibility = useCallback(async (plan) => {
    if (!plan?.id) return;
    setSaving(true);
    try {
      await persistPlanOverride(plan.id, { visible: !(plan.visible !== false) });
      await reload();
    } finally {
      setSaving(false);
    }
  }, [persistPlanOverride, reload]);

  const deletePlan = useCallback(async (plan) => {
    if (!plan?.id) {
      throw new Error('Plano inválido.');
    }

    setSaving(true);
    try {
      if (plan.pagarmeId) {
        try {
          await postJson(DELETE_PLAN_URL, {
            planId: plan.pagarmeId
          });
        } catch (error) {
          if (!isGatewayUnavailableError(error)) {
            throw error;
          }

          await persistPlanOverride(plan.id, {
            deletedAt: new Date().toISOString(),
            deletionSyncPending: true,
            visible: false,
            status: 'inactive'
          });
          await reload();
          return {
            pendingGatewaySync: true
          };
        }
      }

      await remove(ref(database, `system_plan_overrides/${plan.id}`)).catch(() => null);
      await reload();
      return {
        pendingGatewaySync: false
      };
    } finally {
      setSaving(false);
    }
  }, [persistPlanOverride, reload]);

  const savePlan = useCallback(async (payload) => {
    setSaving(true);
    try {
      const amount = parsePlanAmountInput(payload.amount);
      const isOneTime = payload.billingModel === 'one_time';
      const isFree = Boolean(payload.isFree);
      const paymentMethods = Array.isArray(payload.paymentMethods) && payload.paymentMethods.length
        ? payload.paymentMethods
        : ['credit_card', 'boleto'];
      const interval = payload.interval || 'month';
      const intervalCount = Math.max(1, Number(payload.intervalCount || 1));
      const maxInstallments = Math.max(1, Number(payload.maxInstallments || 1));
      const accessDays = Math.max(0, Number(payload.accessDays || 0));
      const featureLimits = FEATURE_LIMIT_KEYS.reduce((accumulator, key) => {
        accumulator[key] = payload.featureLimits?.[key] || '';
        return accumulator;
      }, {});
      if (!payload.title || Number.isNaN(amount)) {
        throw new Error('Informe nome e valor do plano.');
      }
      if (!isFree && amount <= 0) {
        throw new Error('Planos pagos precisam ter um valor maior que zero.');
      }

      if (payload.mode === 'create') {
        const generatedSlug = payload.slug || payload.title.toLowerCase().replace(/\s+/g, '-');
        let createdPlan = null;
        let overrideId = generatedSlug;

        if (!isFree && !isOneTime && amount > 0) {
          const result = await postJson(CREATE_PLAN_URL, {
            name: payload.title,
            description: payload.subtitle || '',
            amount,
            interval,
            interval_count: intervalCount,
            billing_type: payload.billingType || 'prepaid',
            payment_methods: paymentMethods,
            metadata: {
              app_id: generatedSlug,
              subtitle: payload.subtitle || '',
              ideal: payload.ideal || '',
              team: payload.team || '',
              database: payload.database || '',
              billingModel: payload.billingModel || 'recurring',
              interval,
              intervalCount: String(intervalCount),
              billingType: payload.billingType || 'prepaid',
              paymentMethods: paymentMethods.join(','),
              maxInstallments: String(maxInstallments),
              accessDays: String(accessDays),
              trialDays: String(Number(payload.trialDays || 0)),
              graceDays: String(Number(payload.graceDays || 5)),
              isFree: String(isFree),
              recommended: String(Boolean(payload.recommended)),
              featureLimits: JSON.stringify(featureLimits)
            }
          });

          createdPlan = result.plan;
          overrideId = createdPlan.metadata?.app_id || createdPlan.id || generatedSlug;
        }

        await set(ref(database, `system_plan_overrides/${overrideId}`), {
          visible: payload.visible !== false,
          title: payload.title,
          subtitle: payload.subtitle || '',
          ideal: payload.ideal || '',
          team: payload.team || '',
          database: payload.database || '',
          featureLimits,
          amount,
          billingModel: payload.billingModel || (isFree ? 'free' : 'recurring'),
          interval,
          intervalCount,
          billingType: payload.billingType || 'prepaid',
          paymentMethods,
          maxInstallments,
          accessDays,
          trialDays: Number(payload.trialDays || 0),
          graceDays: Number(payload.graceDays || 5),
          isFree,
          recommended: Boolean(payload.recommended),
          status: 'active',
          localOnly: !createdPlan,
          payermeSyncSkipped: !createdPlan,
          pagarmeId: createdPlan?.id || null,
          itemId: createdPlan?.items?.[0]?.id || null,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || null
        });
      } else {
        let gatewaySyncPending = false;
        if (payload.pagarmeId && !isOneTime && !isFree) {
          try {
            await postJson(UPDATE_PLAN_URL, {
              planId: payload.pagarmeId,
              name: payload.title,
              description: payload.subtitle || '',
              status: payload.gatewayStatus || 'active',
              interval,
              interval_count: intervalCount,
              billing_type: payload.billingType || 'prepaid',
              payment_methods: paymentMethods
            });

            if (payload.itemId) {
              await postJson(UPDATE_PLAN_ITEM_URL, {
                planId: payload.pagarmeId,
                itemId: payload.itemId,
                name: payload.title,
                description: payload.subtitle || '',
                amount
              });
            }
          } catch (error) {
            if (!isGatewayUnavailableError(error)) {
              throw error;
            }
            gatewaySyncPending = true;
          }
        }

        await persistPlanOverride(payload.id, {
          visible: payload.visible !== false,
          title: payload.title,
          subtitle: payload.subtitle || '',
          ideal: payload.ideal || '',
          team: payload.team || '',
          database: payload.database || '',
          featureLimits,
          amount,
          billingModel: payload.billingModel || (isFree ? 'free' : 'recurring'),
          interval,
          intervalCount,
          billingType: payload.billingType || 'prepaid',
          paymentMethods,
          maxInstallments,
          accessDays,
          trialDays: Number(payload.trialDays || 0),
          graceDays: Number(payload.graceDays || 5),
          isFree,
          recommended: Boolean(payload.recommended)
        });

        if (gatewaySyncPending) {
          await persistPlanOverride(payload.id, {
            gatewaySyncPending: true,
            gatewaySyncMessage: 'Function de sincronização do gateway indisponível ou não publicada.'
          });
        } else {
          await persistPlanOverride(payload.id, {
            gatewaySyncPending: false,
            gatewaySyncMessage: null
          });
        }
      }

      await reload();
    } finally {
      setSaving(false);
    }
  }, [persistPlanOverride, reload, user]);

  const changeCustomerPlan = useCallback(async ({ authUserId, targetPlanId }) => {
    if (!authUserId || !targetPlanId) {
      throw new Error('Usuário e plano são obrigatórios.');
    }

    setSaving(true);
    try {
      const response = await fetch(CHANGE_PLAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUserId, targetPlanId })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Não foi possível alterar o plano do cliente.');
      }
      await reload();
      return result;
    } finally {
      setSaving(false);
    }
  }, [reload]);

  const updateCustomerLimit = useCallback(async ({ documentId, limit }) => {
    if (!documentId) {
      throw new Error('Cliente inválido.');
    }
    setSaving(true);
    try {
      await update(ref(database, `users/${documentId}`), {
        limiteEleitores: String(limit || ''),
        updatedAt: new Date().toISOString()
      });
      await reload();
    } finally {
      setSaving(false);
    }
  }, [reload]);

  const saveAccountProfile = useCallback(async ({ documentId, payload }) => {
    if (!documentId) {
      throw new Error('Conta inválida.');
    }

    setSaving(true);
    try {
      await update(ref(database, `users/${documentId}`), {
        nome: payload.name || '',
        email: payload.email || '',
        telefone: payload.phone || '',
        tipoUser: payload.role || 'admin',
        status: payload.status || 'Ativo',
        trialDays: Number(payload.trialDays || 0),
        graceDays: Number(payload.graceDays || 5),
        trialEndsAt: payload.trialEndsAt || null,
        nextBillingDate: payload.nextBillingDate || null,
        billingStatus: payload.billingStatus || 'active',
        isFreePlan: Boolean(payload.isFreePlan),
        updatedAt: new Date().toISOString()
      });
      await reload();
    } finally {
      setSaving(false);
    }
  }, [reload]);

  const syncBillingStatus = useCallback(async (documentId) => {
    const target = users.find((entry) => entry.documentId === documentId);
    if (!target?.authUserId) return null;

    setSaving(true);
    try {
      const response = await fetch(SYNC_SUBSCRIPTION_HEALTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.authUserId })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Não foi possível sincronizar a cobrança.');
      }
      await reload();
      return result;
    } finally {
      setSaving(false);
    }
  }, [reload, users]);

  const saveSupportFaq = useCallback(async (payload) => {
    if (!canAccess) return;
    setSaving(true);
    try {
      const data = {
        question: payload.question || '',
        answer: payload.answer || '',
        order: Number(payload.order || 0),
        active: payload.active !== false,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || null
      };

      if (payload.id) {
        await update(ref(database, `supportFaqs/${payload.id}`), data);
      } else {
        const newRef = ref(database, `supportFaqs/${Date.now()}`);
        await set(newRef, {
          ...data,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || null
        });
      }
      await reload();
    } finally {
      setSaving(false);
    }
  }, [canAccess, reload, user]);

  const deleteSupportFaq = useCallback(async (id) => {
    if (!canAccess || !id) return;
    setSaving(true);
    try {
      await set(ref(database, `supportFaqs/${id}`), null);
      await reload();
    } finally {
      setSaving(false);
    }
  }, [canAccess, reload]);

  const saveSupportChannels = useCallback(async (payload) => {
    if (!canAccess) return;
    setSaving(true);
    try {
      await update(ref(database, 'supportChannels/public'), {
        ...payload,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || null
      });
      await reload();
    } finally {
      setSaving(false);
    }
  }, [canAccess, reload, user]);

  return {
    loading,
    saving,
    canAccess,
    users,
    assessors,
    customers,
    plans,
    sales,
    summary,
    planDistribution,
    supportFaqs,
    supportChannels,
    reload,
    togglePlanVisibility,
    deletePlan,
    savePlan,
    changeCustomerPlan,
    updateCustomerLimit,
    saveAccountProfile,
    syncBillingStatus,
    saveSupportFaq,
    deleteSupportFaq,
    saveSupportChannels
  };
}
