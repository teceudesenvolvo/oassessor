import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkVoterPlanLimit,
  comparePlanAmount,
  extractLimitNumber,
  formatInvoiceStatus,
  formatSubscriptionStatus,
  getPrimaryCardId,
  loadScopedCampaignUsage,
  loadUserBillingProfile,
  normalizePlanUsage
} from '../services/planLimits';
import { fetchManagedPlans } from '../services/appPlansService';

const GET_SUBSCRIPTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getSubscriptionDetails';
const CHANGE_PLAN_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/changeSubscriptionPlan';
const CANCEL_SUBSCRIPTION_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/cancelCurrentSubscription';

export function useSubscriptionCenter(user) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState({ voterCount: 0, voterLimit: null, remainingVoters: null, percentage: 0, reached: false });
  const [actionLoading, setActionLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileData, usageData, plansResponse, subscriptionResponse] = await Promise.all([
        loadUserBillingProfile(user),
        loadScopedCampaignUsage(user),
        fetchManagedPlans({ includeHidden: true }),
        fetch(`${GET_SUBSCRIPTION_URL}?userId=${user.uid}`).then((response) => response.json())
      ]);

      const voterLimit = extractLimitNumber(profileData?.limiteEleitores);
      setProfile(profileData);
      setUsage(normalizePlanUsage({ voterCount: usageData.voterCount, voterLimit }));
      setPlans(plansResponse || []);
      setSubscription(subscriptionResponse?.subscription || null);
      setInvoices(
        (subscriptionResponse?.invoices || []).map((invoice) => ({
          ...invoice,
          statusLabel: formatInvoiceStatus(invoice.status)
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar central de assinatura:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const currentPlan = useMemo(() => {
    if (!profile?.planId) return null;
    return plans.find((plan) => plan.id === profile.planId) || null;
  }, [plans, profile]);

  const currentPlanAmount = currentPlan?.amount ?? null;
  const currentCardId = getPrimaryCardId(profile, subscription);

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        changeType: comparePlanAmount(currentPlanAmount, plan.amount)
      })),
    [plans, currentPlanAmount]
  );

  const summary = useMemo(
    () => ({
      planName: profile?.nomePlano || currentPlan?.title || profile?.planId || 'Sem plano',
      planId: profile?.planId || null,
      subscriptionStatus: formatSubscriptionStatus(subscription?.status),
      nextBillingDate: subscription?.next_billing_at || subscription?.current_period_end || null,
      paymentMethod: subscription?.payment_method || 'credit_card',
      currentCardId
    }),
    [currentPlan, currentCardId, profile, subscription]
  );

  const changePlan = useCallback(async (targetPlanId) => {
    if (!user || !targetPlanId) return;
    setActionLoading(true);
    try {
      const response = await fetch(CHANGE_PLAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          targetPlanId
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Não foi possível alterar o plano.');
      }

      await reload();
      return result;
    } finally {
      setActionLoading(false);
    }
  }, [reload, user]);

  const cancelSubscription = useCallback(async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const response = await fetch(CANCEL_SUBSCRIPTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Não foi possível cancelar a assinatura.');
      }

      await reload();
      return result;
    } finally {
      setActionLoading(false);
    }
  }, [reload, user]);

  const canCreateOneVoter = useCallback(async () => checkVoterPlanLimit(user, 1), [user]);

  return {
    loading,
    actionLoading,
    plans: planOptions,
    profile,
    subscription,
    invoices,
    usage,
    summary,
    currentPlan,
    reload,
    changePlan,
    cancelSubscription,
    canCreateOneVoter
  };
}
