import { get, ref } from './firestoreDatabase';
import { database } from '../firebaseConfig';

const GET_PLANS_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getAppPlans';

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
};

export async function loadPlanOverrides() {
  const snapshot = await get(ref(database, 'system_plan_overrides'));
  return snapshot.exists() ? snapshot.val() : {};
}

export async function fetchManagedPlans({ includeHidden = true } = {}) {
  const [plansResponse, overrides] = await Promise.all([
    fetch(GET_PLANS_URL).then((response) => response.json()),
    loadPlanOverrides()
  ]);

  const basePlans = plansResponse?.success ? plansResponse.plans || [] : [];
  const mergedPlans = basePlans.map((plan) => {
    const override = overrides?.[plan.id] || {};
    const visible = override.visible !== undefined ? normalizeBoolean(override.visible, true) : plan.status !== 'inactive';

    return {
      ...plan,
      ...override,
      visible,
      recommended: override.recommended !== undefined ? normalizeBoolean(override.recommended, false) : plan.recommended,
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

  return includeHidden ? mergedPlans : mergedPlans.filter((plan) => plan.visible !== false && plan.status !== 'inactive');
}
