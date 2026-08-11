import { get, ref } from './firestoreDatabase';
import { database } from '../firebaseConfig';

const GET_PLANS_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getAppPlans';
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

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
};

export async function loadPlanOverrides() {
  try {
    const snapshot = await get(ref(database, 'system_plan_overrides'));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.warn('Falha ao carregar overrides públicos de planos. Seguindo com os planos base.', error);
    return {};
  }
}

export async function fetchManagedPlans({ includeHidden = true } = {}) {
  const [plansResponse, overrides] = await Promise.all([
    fetch(GET_PLANS_URL).then((response) => response.json()),
    loadPlanOverrides()
  ]);

  const basePlans = plansResponse?.success ? plansResponse.plans || [] : [];
  const overrideEntries = Object.entries(overrides || {});
  const mergedPlans = basePlans.map((plan) => {
    const override = overrides?.[plan.id] || {};
    const featureLimits = FEATURE_LIMIT_KEYS.reduce((accumulator, key) => {
      accumulator[key] = override.featureLimits?.[key] ?? plan.featureLimits?.[key] ?? '';
      return accumulator;
    }, {});
    const visible = override.visible !== undefined ? normalizeBoolean(override.visible, true) : plan.status !== 'inactive';

    return {
      ...plan,
      ...override,
      featureLimits,
      visible,
      recommended: override.recommended !== undefined ? normalizeBoolean(override.recommended, false) : plan.recommended,
      isFree: override.isFree !== undefined ? normalizeBoolean(override.isFree, false) : normalizeBoolean(plan.isFree, false),
      trialDays: Number(override.trialDays ?? plan.trialDays ?? 0),
      graceDays: Number(override.graceDays ?? plan.graceDays ?? 5),
      title: override.title || plan.title,
      subtitle: override.subtitle || plan.subtitle,
      ideal: override.ideal || plan.ideal,
      team: override.team || plan.team,
      database: override.database || plan.database,
      amount: override.amount !== undefined ? Number(override.amount) : plan.amount,
      price: override.amount !== undefined
        ? Number(override.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : plan.price,
      overrideId: plan.id
    };
  });

  const baseIds = new Set(mergedPlans.map((plan) => plan.id));
  const localOnlyPlans = overrideEntries
    .filter(([planId, override]) => !baseIds.has(planId) && !override?.deletedAt)
    .map(([planId, override]) => {
      const featureLimits = FEATURE_LIMIT_KEYS.reduce((accumulator, key) => {
        accumulator[key] = override.featureLimits?.[key] ?? '';
        return accumulator;
      }, {});

      const amount = Number(override.amount || 0);

      return {
        id: planId,
        overrideId: planId,
        title: override.title || planId,
        subtitle: override.subtitle || '',
        ideal: override.ideal || '',
        team: override.team || '',
        database: override.database || '',
        amount,
        price: amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        status: override.status || 'active',
        visible: normalizeBoolean(override.visible, true),
        recommended: normalizeBoolean(override.recommended, false),
        isFree: normalizeBoolean(override.isFree, amount === 0),
        trialDays: Number(override.trialDays ?? 0),
        graceDays: Number(override.graceDays ?? 5),
        featureLimits,
        localOnly: true,
        pagarmeId: override.pagarmeId || null,
        itemId: override.itemId || null,
        gatewaySyncPending: Boolean(override.gatewaySyncPending),
        createdAt: override.createdAt || null,
        updatedAt: override.updatedAt || null
      };
    });

  const availablePlans = [...mergedPlans, ...localOnlyPlans].filter((plan) => !plan.deletedAt);

  const filteredPlans = includeHidden
    ? availablePlans
    : availablePlans.filter((plan) => plan.visible !== false && plan.status !== 'inactive');

  return [...filteredPlans].sort((planA, planB) => {
    const amountA = Number(planA.amount);
    const amountB = Number(planB.amount);
    const normalizedA = Number.isFinite(amountA) ? amountA : Number.POSITIVE_INFINITY;
    const normalizedB = Number.isFinite(amountB) ? amountB : Number.POSITIVE_INFINITY;
    return normalizedA - normalizedB || String(planA.title || '').localeCompare(String(planB.title || ''), 'pt-BR');
  });
}
