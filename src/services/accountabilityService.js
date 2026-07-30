import { equalTo, get, orderByChild, push, query, ref, set, update } from './firestoreDatabase';
import { database } from '../firebaseConfig';

const COLLECTIONS = {
  config: 'prestacaoContasConfiguracoes',
  bankAccounts: 'prestacaoContasContasBancarias',
  revenues: 'prestacaoContasReceitas',
  expenses: 'prestacaoContasDespesas',
  catalogs: 'prestacaoContasCadastros',
  documents: 'prestacaoContasDocumentos',
  budget: 'prestacaoContasOrcamentos',
  reviews: 'prestacaoContasRevisoes',
  closing: 'prestacaoContasFechamentos'
};

const DEFAULT_CAMPAIGN = {
  campaignId: 'campanha-principal',
  organizationId: 'organizacao-principal',
  campaignName: 'Campanha principal',
  candidateName: 'Candidato',
  office: 'Cargo não informado',
  electionLabel: 'Eleições 2026',
  round: '1º turno',
  city: 'Município',
  state: 'UF',
  accountabilityStatus: 'não iniciada',
  financialManager: 'Não definido',
  accountantName: 'Não definido',
  selectedPeriod: 'Ciclo completo'
};

const formatStringDate = (value) => {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const isNotDeleted = (entry) => !entry.deletedAt;

export async function resolveAccountabilityScope(user) {
  if (!user) return null;

  let adminId = user.uid;
  let organizationId = user.uid;

  const directSnapshot = await get(ref(database, `users/${user.uid}`));
  if (directSnapshot.exists()) {
    const data = directSnapshot.val();
    adminId = data.adminId || data.userId || user.uid;
    organizationId = data.organizationId || adminId;
    return { adminId, organizationId, profile: data };
  }

  const usersSnapshot = await get(query(ref(database, 'users'), orderByChild('userId'), equalTo(user.uid)));
  if (usersSnapshot.exists()) {
    const data = Object.values(usersSnapshot.val())[0];
    adminId = data.adminId || data.userId || user.uid;
    organizationId = data.organizationId || adminId;
    return { adminId, organizationId, profile: data };
  }

  return { adminId, organizationId, profile: null };
}

export function buildBaseMeta({ scope, user, overrides = {} }) {
  return {
    campaignId: overrides.campaignId || DEFAULT_CAMPAIGN.campaignId,
    organizationId: scope?.organizationId || scope?.adminId || user?.uid || DEFAULT_CAMPAIGN.organizationId,
    adminId: scope?.adminId || user?.uid || '',
    createdBy: overrides.createdBy || user?.email || '',
    updatedBy: user?.email || '',
    status: overrides.status || 'ativo'
  };
}

export async function listScopedCollection(collectionKey, scope) {
  const snapshot = await get(query(ref(database, COLLECTIONS[collectionKey]), orderByChild('adminId'), equalTo(scope.adminId)));
  const list = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })).filter(isNotDeleted)
    : [];
  return list;
}

export async function upsertScopedRecord(collectionKey, payload, scope, user, recordId = null) {
  const collectionPath = COLLECTIONS[collectionKey];
  const baseMeta = buildBaseMeta({ scope, user, overrides: payload });
  const now = new Date().toISOString();

  const data = {
    ...payload,
    ...baseMeta,
    updatedAt: now,
    updatedBy: user?.email || ''
  };

  if (recordId) {
    await update(ref(database, `${collectionPath}/${recordId}`), data);
    return recordId;
  }

  const newRef = push(ref(database, collectionPath));
  await set(newRef, {
    ...data,
    createdAt: now,
    createdBy: user?.email || ''
  });
  return newRef.key;
}

export async function softDeleteScopedRecord(collectionKey, recordId, reason, scope, user) {
  const collectionPath = COLLECTIONS[collectionKey];
  await update(ref(database, `${collectionPath}/${recordId}`), {
    deletedAt: new Date().toISOString(),
    deletedBy: user?.email || '',
    deleteReason: reason || 'Sem justificativa',
    status: 'arquivado',
    adminId: scope.adminId
  });
}

export async function loadAccountabilitySummary(scope) {
  const [
    configList,
    bankAccounts,
    revenues,
    expenses,
    documents,
    budgets,
    reviews,
    closings
  ] = await Promise.all([
    listScopedCollection('config', scope),
    listScopedCollection('bankAccounts', scope),
    listScopedCollection('revenues', scope),
    listScopedCollection('expenses', scope),
    listScopedCollection('documents', scope),
    listScopedCollection('budget', scope),
    listScopedCollection('reviews', scope),
    listScopedCollection('closing', scope)
  ]);

  const config = configList[0] || {};
  const totalRevenues = revenues.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
  const bankBalance = bankAccounts.reduce((sum, item) => sum + Number(item.reportedBalanceCents || item.initialBalanceCents || 0), 0);
  const plannedBudget = budgets.reduce((sum, item) => sum + Number(item.plannedAmountCents || 0), 0);
  const nonReconciled = [...revenues, ...expenses].filter((item) => item.status !== 'conciliada').length;
  const missingDocs = [...revenues, ...expenses].filter((item) => !item.documentId && !item.documentUrl).length;
  const criticalIssues = [
    ...expenses.filter((item) => item.status === 'com inconsistência'),
    ...revenues.filter((item) => item.status === 'com inconsistência')
  ].length;

  const stepChecks = {
    configuracao: Boolean(config.id || config.candidateName || config.campaignName),
    contas: bankAccounts.length > 0,
    receitas: revenues.length > 0,
    despesas: expenses.length > 0,
    documentos: documents.length > 0 || missingDocs === 0,
    conciliacao: nonReconciled === 0 && (revenues.length > 0 || expenses.length > 0),
    revisao: reviews.some((item) => item.status === 'concluida'),
    fechamento: closings.some((item) => item.status === 'fechada')
  };

  const completedSteps = Object.values(stepChecks).filter(Boolean).length;
  const progress = Math.round((completedSteps / Object.keys(stepChecks).length) * 100);

  return {
    header: {
      ...DEFAULT_CAMPAIGN,
      ...config,
      accountabilityStatus: config.accountabilityStatus || DEFAULT_CAMPAIGN.accountabilityStatus,
      selectedPeriod: config.selectedPeriod || DEFAULT_CAMPAIGN.selectedPeriod,
      progress
    },
    metrics: {
      totalRevenues,
      totalExpenses,
      financialBalance: totalRevenues - totalExpenses,
      bankBalance,
      committedValue: totalExpenses,
      expensesPendingPayment: expenses.filter((item) => item.status === 'aguardando pagamento').length,
      pendingRevenues: revenues.filter((item) => String(item.status || '').includes('pendente')).length,
      nonReconciled,
      missingDocs,
      criticalIssues,
      progress,
      plannedBudget,
      lastMovement: formatStringDate([...revenues, ...expenses].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0]?.updatedAt),
      lastReconciliation: formatStringDate(
        [...revenues, ...expenses].filter((item) => item.status === 'conciliada').sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0]?.updatedAt
      ),
      lastReview: formatStringDate(reviews.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0]?.updatedAt)
    },
    checks: stepChecks,
    attention: {
      expensesWithoutDocument: expenses.filter((item) => !item.documentId).length,
      revenuesWithoutProof: revenues.filter((item) => !item.documentId).length,
      duplicateEntries: 0,
      pendingStatements: bankAccounts.filter((item) => item.status !== 'ativa').length,
      balanceDivergences: bankAccounts.filter((item) => Number(item.reportedBalanceCents || 0) !== Number(item.initialBalanceCents || 0)).length,
      pendingReviews: [...revenues, ...expenses].filter((item) => item.status === 'pendente de revisão').length
    }
  };
}

export const accountabilityCollections = COLLECTIONS;
