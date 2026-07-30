import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, ref, set, update } from '../services/firestoreDatabase';
import { database } from '../firebaseConfig';
import { fetchManagedPlans } from '../services/appPlansService';
import { extractLimitNumber } from '../services/planLimits';

const CREATE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/createPagarmePlan';
const UPDATE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/updatePagarmePlan';
const UPDATE_PLAN_ITEM_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/updatePagarmePlanItem';
const CHANGE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/changeSubscriptionPlan';

const formatCurrency = (amount = 0) =>
  Number(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const normalizeCollection = (snapshot) =>
  snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })) : [];

const normalizeUser = (entry) => {
  const planLimit = extractLimitNumber(entry.limiteEleitores);
  return {
    ...entry,
    authUserId: entry.userId || entry.id,
    name: entry.nome || entry.name || entry.email || 'Usuário',
    role: entry.tipoUser || 'assessor',
    status: entry.status || 'Ativo',
    planId: entry.planId || null,
    planName: entry.nomePlano || entry.planName || null,
    planLimit,
    email: entry.email || '',
    phone: entry.telefone || entry.phone || '',
    createdAt: entry.createdAt || entry.updatedAt || null
  };
};

export function useSystemCenter(user) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);

  const canAccess = String(user?.email || '').toLowerCase() === 'leo@gmail.com';

  const reload = useCallback(async () => {
    if (!user || !canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [usersSnapshot, plansResponse] = await Promise.all([
        get(ref(database, 'users')),
        fetchManagedPlans({ includeHidden: true })
      ]);

      setUsers(normalizeCollection(usersSnapshot).map(normalizeUser));
      setPlans(plansResponse || []);
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
      users.filter((entry) => entry.subscriptionId || entry.planId || entry.pagarmeCustomerId),
    [users]
  );

  const summary = useMemo(() => {
    const hiddenPlans = plans.filter((plan) => plan.visible === false).length;
    const activePlans = plans.filter((plan) => plan.visible !== false).length;
    const activeCustomers = customers.filter((entry) => String(entry.subscriptionStatus || entry.status).toLowerCase() !== 'cancelada').length;
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
      mrr: formatCurrency(mrr / 100)
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
          status: entry.subscriptionStatus || entry.status || 'Ativo',
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

  const savePlan = useCallback(async (payload) => {
    setSaving(true);
    try {
      const amount = Number(payload.amount || 0);
      if (!payload.title || !amount) {
        throw new Error('Informe nome e valor do plano.');
      }

      if (payload.mode === 'create') {
        const response = await fetch(CREATE_PLAN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.title,
            description: payload.subtitle || '',
            amount,
            interval: 'month',
            interval_count: 1,
            metadata: {
              app_id: payload.slug || payload.title.toLowerCase().replace(/\s+/g, '-'),
              subtitle: payload.subtitle || '',
              ideal: payload.ideal || '',
              team: payload.team || '',
              database: payload.database || '',
              recommended: String(Boolean(payload.recommended))
            }
          })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Não foi possível criar o plano.');
        }

        const createdPlan = result.plan;
        const overrideId = createdPlan.metadata?.app_id || createdPlan.id;
        await set(ref(database, `system_plan_overrides/${overrideId}`), {
          visible: payload.visible !== false,
          title: payload.title,
          subtitle: payload.subtitle || '',
          ideal: payload.ideal || '',
          team: payload.team || '',
          database: payload.database || '',
          amount,
          recommended: Boolean(payload.recommended),
          createdAt: new Date().toISOString(),
          createdBy: user?.email || null
        });
      } else {
        const response = await fetch(UPDATE_PLAN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: payload.pagarmeId,
            name: payload.title,
            description: payload.subtitle || '',
            status: payload.gatewayStatus || 'active'
          })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Não foi possível atualizar o plano.');
        }

        if (payload.itemId) {
          const itemResponse = await fetch(UPDATE_PLAN_ITEM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: payload.pagarmeId,
              itemId: payload.itemId,
              name: payload.title,
              description: payload.subtitle || '',
              amount
            })
          });
          const itemResult = await itemResponse.json();
          if (!itemResponse.ok || !itemResult.success) {
            throw new Error(itemResult.error || 'Não foi possível atualizar o valor do plano.');
          }
        }

        await persistPlanOverride(payload.id, {
          visible: payload.visible !== false,
          title: payload.title,
          subtitle: payload.subtitle || '',
          ideal: payload.ideal || '',
          team: payload.team || '',
          database: payload.database || '',
          amount,
          recommended: Boolean(payload.recommended)
        });
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

  return {
    loading,
    saving,
    canAccess,
    users,
    customers,
    plans,
    sales,
    summary,
    planDistribution,
    reload,
    togglePlanVisibility,
    savePlan,
    changeCustomerPlan,
    updateCustomerLimit
  };
}
