import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Blocks,
  HelpCircle,
  Eye,
  EyeOff,
  LayoutDashboard,
  Mail,
  MessageCircle,
  RefreshCcw,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../../useAuth';
import { useSystemCenter } from '../../hooks/useSystemCenter';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

const TABS = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'clients', label: 'Clientes', icon: Shield },
  { id: 'sales', label: 'Vendas', icon: BadgeDollarSign },
  { id: 'plans', label: 'Planos', icon: Blocks },
  { id: 'governance', label: 'Governança', icon: Settings2 }
];

const INITIAL_PLAN_FORM = {
  mode: 'create',
  id: '',
  pagarmeId: '',
  itemId: '',
  title: '',
  subtitle: '',
  ideal: '',
  team: '',
  database: '',
  amount: '',
  billingModel: 'recurring',
  interval: 'month',
  intervalCount: '1',
  billingType: 'prepaid',
  maxInstallments: '1',
  accessDays: '0',
  paymentMethods: ['credit_card', 'boleto'],
  trialDays: '0',
  graceDays: '5',
  isFree: false,
  recommended: false,
  visible: true,
  gatewayStatus: 'active',
  slug: '',
  featureLimits: {
    leaderships: '',
    volunteers: '',
    visits: '',
    demands: '',
    events: '',
    communication: '',
    territory: '',
    research: '',
    team: '',
    agenda: ''
  }
};

const FEATURE_LIMIT_FIELDS = [
  { key: 'leaderships', label: 'Lideranças' },
  { key: 'volunteers', label: 'Voluntários' },
  { key: 'visits', label: 'Visitas' },
  { key: 'demands', label: 'Demandas' },
  { key: 'events', label: 'Eventos' },
  { key: 'communication', label: 'Comunicação' },
  { key: 'territory', label: 'Território' },
  { key: 'research', label: 'Pesquisas' },
  { key: 'team', label: 'Minha equipe' },
  { key: 'agenda', label: 'Agenda' }
];

export default function SystemCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedCustomerPlan, setSelectedCustomerPlan] = useState({});
  const [limitDrafts, setLimitDrafts] = useState({});
  const [accountDrafts, setAccountDrafts] = useState({});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState({
    users: '',
    clients: '',
    sales: '',
    plans: ''
  });
  const [planForm, setPlanForm] = useState(INITIAL_PLAN_FORM);
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '', order: '' });
  const [channelsForm, setChannelsForm] = useState({
    whatsapp: '',
    email: '',
    whatsappLabel: '',
    emailLabel: ''
  });

  const {
    loading,
    saving,
    canAccess,
    users,
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
  } = useSystemCenter(user);

  React.useEffect(() => {
    setChannelsForm({
      whatsapp: supportChannels.whatsapp || '',
      email: supportChannels.email || '',
      whatsappLabel: supportChannels.whatsappLabel || '',
      emailLabel: supportChannels.emailLabel || ''
    });
  }, [supportChannels]);

  React.useEffect(() => {
    setAccountDrafts(
      Object.fromEntries(
        users.map((entry) => [
          entry.documentId || entry.id,
          {
            name: entry.name || '',
            email: entry.email || '',
            phone: entry.phone || '',
            role: entry.role || 'admin',
            status: entry.status || 'Ativo',
            trialDays: String(entry.effectiveTrialDays ?? entry.trialDays ?? 0),
            graceDays: String(entry.effectiveGraceDays ?? entry.graceDays ?? 5),
            trialEndsAt: entry.trialEndsAt ? String(entry.trialEndsAt).slice(0, 10) : '',
            nextBillingDate: entry.nextBillingDate ? String(entry.nextBillingDate).slice(0, 10) : '',
            billingStatus: entry.billingStatus || 'active',
            isFreePlan: Boolean(entry.isFreePlan)
          }
        ])
      )
    );
  }, [users]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const filteredUsers = useMemo(() => {
    const term = search.users.trim().toLowerCase();
    if (!term) return users;
    return users.filter((entry) =>
      [entry.name, entry.email, entry.role, entry.planName, entry.status, entry.billingLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [search.users, users]);

  const filteredCustomers = useMemo(() => {
    const term = search.clients.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((entry) =>
      [entry.name, entry.email, entry.planName, entry.subscriptionStatus, entry.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [customers, search.clients]);

  const filteredSales = useMemo(() => {
    const term = search.sales.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((entry) =>
      [entry.customerName, entry.email, entry.planName, entry.status, entry.amount]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [sales, search.sales]);

  const filteredPlans = useMemo(() => {
    const term = search.plans.trim().toLowerCase();
    if (!term) return plans;
    return plans.filter((entry) =>
      [entry.title, entry.subtitle, entry.ideal, entry.team, entry.database, entry.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [plans, search.plans]);

  const selectedUser = useMemo(
    () => users.find((entry) => (entry.documentId || entry.id) === selectedUserId) || null,
    [selectedUserId, users]
  );

  const handlePlanEdit = (plan) => {
    setSelectedPlanId(plan.id);
    setPlanForm({
      mode: 'edit',
      id: plan.id,
      pagarmeId: plan.pagarmeId,
      itemId: plan.itemId,
      title: plan.title || '',
      subtitle: plan.subtitle || '',
      ideal: plan.ideal || '',
      team: plan.team || '',
      database: plan.database || '',
      amount: String(plan.amount || ''),
      billingModel: plan.billingModel || (plan.isFree ? 'free' : 'recurring'),
      interval: String(plan.interval || 'month'),
      intervalCount: String(plan.intervalCount || 1),
      billingType: plan.billingType || 'prepaid',
      maxInstallments: String(plan.maxInstallments || 1),
      accessDays: String(plan.accessDays || 0),
      paymentMethods: Array.isArray(plan.paymentMethods) && plan.paymentMethods.length ? plan.paymentMethods : ['credit_card', 'boleto'],
      trialDays: String(plan.trialDays || 0),
      graceDays: String(plan.graceDays || 5),
      isFree: Boolean(plan.isFree),
      recommended: Boolean(plan.recommended),
      visible: plan.visible !== false,
      gatewayStatus: plan.status || 'active',
      slug: plan.id,
      featureLimits: FEATURE_LIMIT_FIELDS.reduce((accumulator, field) => {
        accumulator[field.key] = plan.featureLimits?.[field.key] || '';
        return accumulator;
      }, {})
    });
  };

  const formatDate = (value) => {
    if (!value) return 'Não informado';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Não informado';
    return parsed.toLocaleDateString('pt-BR');
  };

  const updateAccountDraft = (entryId, field, value) => {
    setAccountDrafts((prev) => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value
      }
    }));
  };

  const handlePlanCreateMode = () => {
    setSelectedPlanId('');
    setPlanForm(INITIAL_PLAN_FORM);
  };

  const togglePlanPaymentMethod = (method) => {
    setPlanForm((prev) => {
      const existing = Array.isArray(prev.paymentMethods) ? prev.paymentMethods : [];
      const next = existing.includes(method)
        ? existing.filter((item) => item !== method)
        : [...existing, method];
      return {
        ...prev,
        paymentMethods: next.length ? next : [method]
      };
    });
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    try {
      await savePlan({
        ...planForm,
        amount: Number(planForm.amount)
      });
      handlePlanCreateMode();
      alert('Plano salvo com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      alert(
        error.message?.includes('cloudfunctions.net')
          ? 'A function do gateway não foi encontrada. As alterações locais podem precisar de deploy das Cloud Functions para sincronizar com o Pagar.me.'
          : (error.message || 'Não foi possível salvar o plano.')
      );
    }
  };

  if (!canAccess) {
    return (
      <div className="campaign-dashboard">
        <section className="campaign-filters-card">
          <div className="campaign-filters-header">
            <div>
              <p className="campaign-kicker">
                <Shield size={16} />
                Central do sistema
              </p>
              <h3>Acesso restrito</h3>
            </div>
          </div>
          <p style={{ margin: 0, color: '#64748b', lineHeight: 1.7 }}>
            Esta central foi liberada apenas para o operador mestre do sistema. Para esta conta, a navegação permanece nas demais áreas do portal.
          </p>
        </section>
      </div>
    );
  }

  if (loading) {
    return <div className="dashboard-card">Carregando central do sistema...</div>;
  }

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <Shield size={16} />
              Gestão sistêmica
            </p>
            <h3>Central do sistema</h3>
          </div>

          <button type="button" className="btn-secondary" onClick={reload} disabled={saving}>
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>

        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.7 }}>
          Painel-mestre para operar usuários, clientes, vendas e planos do oAssessor com visão executiva e ação direta sobre o negócio.
        </p>

        <div className="profile-tabs-row system-tabs-row" style={{ marginTop: '20px' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Usuários totais" value={summary.totalUsers} helper="Contas cadastradas no sistema" />
        <MetricCard title="Clientes ativos" value={summary.activeCustomers} helper="Operações com plano ou assinatura" tone="success" />
        <MetricCard title="Vendas registradas" value={summary.totalSales} helper="Assinaturas vinculadas ao gateway" tone="highlight" />
        <MetricCard title="MRR estimado" value={summary.mrr} helper="Receita mensal recorrente aproximada" />
        <MetricCard title="Contas em teste" value={summary.trialAccounts} helper="Proprietários dentro do período grátis" />
        <MetricCard title="Contas bloqueadas" value={summary.blockedAccounts} helper="Acesso suspenso após carência" tone="danger" />
      </div>

      {activeTab === 'overview' ? (
        <div className="campaign-main-grid system-main-grid">
          <InsightPanel title="Radar operacional" subtitle="Onde agir primeiro para manter tração comercial e controle da plataforma">
            <div className="system-overview-grid">
              <article className="system-overview-card">
                <strong>Base administrada</strong>
                <span>{users.length}</span>
                <p>Conta(s) sob gestão direta na central administrativa.</p>
              </article>
              <article className="system-overview-card">
                <strong>Clientes monetizados</strong>
                <span>{customers.length}</span>
                <p>Conta(s) com plano, customer ou assinatura vinculada.</p>
              </article>
              <article className="system-overview-card">
                <strong>Portfólio de planos</strong>
                <span>{plans.length}</span>
                <p>Plano(s) sincronizados entre gateway e override comercial.</p>
              </article>
            </div>
          </InsightPanel>

          <InsightPanel title="Distribuição por plano" subtitle="Quantos clientes estão concentrados em cada oferta" compact>
            <div className="users-card-list scrollable-panel compact-list-panel">
              {planDistribution.length ? (
                planDistribution.map((plan) => (
                  <article key={plan.id} className="users-card">
                    <div className="users-card-head">
                      <div>
                        <strong>{plan.title}</strong>
                        <p>{plan.price} • {plan.visible === false ? 'Oculto' : 'Visível'}</p>
                      </div>
                      <span className="users-role-pill">{plan.customers} cliente(s)</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="users-card">
                  <div className="users-card-head">
                    <div>
                      <strong>Nenhum plano disponível</strong>
                      <p>Assim que a base comercial carregar, a distribuição por plano aparecerá aqui.</p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {activeTab === 'governance' ? (
        <div className="campaign-main-grid system-main-grid">
          <InsightPanel title="FAC · Perguntas frequentes" subtitle="Fonte única para portal web e aplicativo">
            <div className="settings-inline-form" style={{ marginBottom: '16px' }}>
              <input
                className="campaign-filter-select"
                placeholder="Pergunta frequente"
                value={faqForm.question}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, question: event.target.value }))}
              />
              <input
                className="campaign-filter-select"
                placeholder="Resposta"
                value={faqForm.answer}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, answer: event.target.value }))}
              />
              <input
                className="campaign-filter-select"
                placeholder="Ordem"
                value={faqForm.order}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, order: event.target.value }))}
              />
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    await saveSupportFaq(faqForm);
                    setFaqForm({ id: '', question: '', answer: '', order: '' });
                    alert('FAQ salvo com sucesso.');
                  } catch (error) {
                    alert(error.message || 'Não foi possível salvar o FAQ.');
                  }
                }}
              >
                Salvar FAQ
              </button>
            </div>

            <div className="users-card-list scrollable-panel compact-list-panel">
              {supportFaqs.length ? (
                supportFaqs.map((faq) => (
                  <article key={faq.id} className="users-card">
                    <div className="users-card-head">
                      <div>
                        <strong>{faq.question}</strong>
                        <p>{faq.answer}</p>
                      </div>
                      <div className="users-card-tags">
                        <span className="users-role-pill">#{faq.order || 0}</span>
                        <button
                          type="button"
                          className="funnel-link-btn"
                          onClick={() => setFaqForm({
                            id: faq.id,
                            question: faq.question || '',
                            answer: faq.answer || '',
                            order: String(faq.order || '')
                          })}
                        >
                          <HelpCircle size={16} />
                        </button>
                        <button
                          type="button"
                          className="funnel-link-btn"
                          onClick={() => deleteSupportFaq(faq.id)}
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className="users-card">
                  <div className="users-card-head">
                    <div>
                      <strong>Nenhum FAQ cadastrado</strong>
                      <p>Cadastre perguntas frequentes para centralizar o suporte do portal e do app.</p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </InsightPanel>

          <InsightPanel title="SAC · Canais de atendimento" subtitle="Contato público centralizado para portal e app" compact>
            <div className="campaign-filters-grid">
              <label className="funnel-filter-field">
                <span>WhatsApp</span>
                <input className="campaign-filter-select" value={channelsForm.whatsapp} onChange={(event) => setChannelsForm((prev) => ({ ...prev, whatsapp: event.target.value }))} />
              </label>
              <label className="funnel-filter-field">
                <span>E-mail</span>
                <input className="campaign-filter-select" value={channelsForm.email} onChange={(event) => setChannelsForm((prev) => ({ ...prev, email: event.target.value }))} />
              </label>
              <label className="funnel-filter-field">
                <span>Texto do WhatsApp</span>
                <textarea className="campaign-filter-select system-support-textarea" value={channelsForm.whatsappLabel} onChange={(event) => setChannelsForm((prev) => ({ ...prev, whatsappLabel: event.target.value }))} rows={3} />
              </label>
              <label className="funnel-filter-field">
                <span>Texto do e-mail</span>
                <textarea className="campaign-filter-select system-support-textarea" value={channelsForm.emailLabel} onChange={(event) => setChannelsForm((prev) => ({ ...prev, emailLabel: event.target.value }))} rows={3} />
              </label>
            </div>

            <div className="campaign-alert-list system-support-preview" style={{ marginTop: '16px' }}>
              <div className="campaign-alert-item system-support-card">
                <MessageCircle size={18} />
                <div>
                  <strong>WhatsApp</strong>
                  <p>{channelsForm.whatsapp || 'Não configurado'}</p>
                  <small>{channelsForm.whatsappLabel || 'Texto de apoio ainda não configurado.'}</small>
                </div>
              </div>
              <div className="campaign-alert-item system-support-card">
                <Mail size={18} />
                <div>
                  <strong>E-mail</strong>
                  <p>{channelsForm.email || 'Não configurado'}</p>
                  <small>{channelsForm.emailLabel || 'Texto de apoio ainda não configurado.'}</small>
                </div>
              </div>
            </div>

            <div className="funnel-modal-actions">
              <span />
              <button className="btn-primary" onClick={() => saveSupportChannels(channelsForm)}>Salvar canais</button>
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <InsightPanel title="Contas proprietárias" subtitle="Administre apenas donos de conta, com uso consolidado da equipe e estado de cobrança">
          <div className="system-toolbar">
            <label className="system-search-field">
              <Search size={16} />
              <input
                className="campaign-filter-select"
                placeholder="Buscar por nome, e-mail, papel ou plano"
                value={search.users}
                onChange={(event) => setSearch((prev) => ({ ...prev, users: event.target.value }))}
              />
            </label>
            <span className="users-role-pill">{filteredUsers.length} conta(s)</span>
          </div>

          <div className="users-card-list scrollable-panel long-list-panel">
            {filteredUsers.length ? (
              filteredUsers.map((entry) => (
                <article key={entry.id} className="users-card system-user-list-item">
                  <div className="users-card-head">
                    <div>
                      <strong>{entry.name}</strong>
                      <p>{entry.email || 'Sem e-mail'} • Administrador</p>
                    </div>
                    <div className="users-card-tags">
                      <span className="users-role-pill">{entry.billingLabel || entry.status}</span>
                      {entry.planName ? <span className="users-role-pill">{entry.planName}</span> : null}
                    </div>
                  </div>

                  <div className="system-entity-grid">
                    <div className="system-entity-cell">
                      <span>Uso da base</span>
                      <strong>{entry.voterUsage || 0} eleitor(es)</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Equipe vinculada</span>
                      <strong>{entry.teamSize || 1} pessoa(s)</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Limite da conta</span>
                      <strong>{entry.planLimit || 'Sem limite'}</strong>
                    </div>
                  </div>

                  <div className="system-card-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setSelectedUserId(entry.documentId || entry.id)}
                    >
                      Abrir gestão da conta
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <article className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>Nenhum usuário encontrado</strong>
                    <p>Refine a busca ou aguarde a sincronização da base administrativa.</p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'clients' ? (
        <InsightPanel title="Planos por conta proprietária" subtitle="A assinatura e os limites valem para a equipe inteira, nunca para membros isolados">
          <div className="system-toolbar">
            <label className="system-search-field">
              <Search size={16} />
              <input
                className="campaign-filter-select"
                placeholder="Buscar cliente por nome, e-mail, status ou plano"
                value={search.clients}
                onChange={(event) => setSearch((prev) => ({ ...prev, clients: event.target.value }))}
              />
            </label>
            <span className="users-role-pill">{filteredCustomers.length} cliente(s)</span>
          </div>

          <div className="users-card-list scrollable-panel long-list-panel">
            {filteredCustomers.length ? (
              filteredCustomers.map((entry) => (
                <article key={entry.id} className="users-card system-customer-card">
                  <div className="users-card-head">
                    <div>
                      <strong>{entry.name}</strong>
                      <p>{entry.email || 'Sem e-mail'} • {entry.planName || 'Sem plano vinculado'}</p>
                    </div>
                    <span className="users-role-pill">{entry.billingLabel || entry.subscriptionStatus || entry.status}</span>
                  </div>

                  <div className="system-inline-grid">
                    <label className="campaign-filter-field">
                      <span>Plano do cliente</span>
                      <select
                        className="campaign-filter-select"
                        value={selectedCustomerPlan[entry.id] || entry.planId || ''}
                        onChange={(event) =>
                          setSelectedCustomerPlan((prev) => ({ ...prev, [entry.id]: event.target.value }))
                        }
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="campaign-filter-field">
                      <span>Limite da equipe</span>
                      <input
                        className="campaign-filter-select"
                        value={limitDrafts[entry.id] ?? entry.planLimit ?? ''}
                        onChange={(event) =>
                          setLimitDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))
                        }
                        placeholder="Ex.: 1000"
                      />
                    </label>
                  </div>

                  <div className="system-entity-grid">
                    <div className="system-entity-cell">
                      <span>Customer ID</span>
                      <strong>{entry.pagarmeCustomerId || 'Não vinculado'}</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Subscription ID</span>
                      <strong>{entry.subscriptionId || 'Não vinculada'}</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Plano atual</span>
                      <strong>{entry.planName || 'Sem plano'}</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Uso da conta</span>
                      <strong>{entry.voterUsage || 0} eleitor(es)</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Membros vinculados</span>
                      <strong>{entry.teamSize || 1} pessoa(s)</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Status de cobrança</span>
                      <strong>{entry.billingLabel || entry.subscriptionStatus || entry.status || 'Sem status'}</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Carência após vencimento</span>
                      <strong>{entry.effectiveGraceDays || 5} dia(s)</strong>
                    </div>
                    <div className="system-entity-cell">
                      <span>Tipo de conta</span>
                      <strong>Administrador</strong>
                    </div>
                  </div>

                  <div className="system-card-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={saving || !selectedCustomerPlan[entry.id]}
                      onClick={async () => {
                        try {
                          await changeCustomerPlan({
                            authUserId: entry.authUserId,
                            targetPlanId: selectedCustomerPlan[entry.id]
                          });
                          alert('Plano do cliente atualizado com sucesso.');
                        } catch (error) {
                          console.error('Erro ao alterar plano do cliente:', error);
                          alert(error.message || 'Não foi possível alterar o plano do cliente.');
                        }
                      }}
                    >
                      Alterar plano
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={saving}
                      onClick={async () => {
                        try {
                          await updateCustomerLimit({
                            documentId: entry.id,
                            limit: limitDrafts[entry.id] ?? entry.planLimit ?? ''
                          });
                          alert('Limite atualizado com sucesso.');
                        } catch (error) {
                          console.error('Erro ao atualizar limite:', error);
                          alert(error.message || 'Não foi possível atualizar o limite.');
                        }
                      }}
                    >
                      Salvar limite
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <article className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>Nenhum cliente encontrado</strong>
                    <p>Não há clientes compatíveis com esse filtro neste momento.</p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'sales' ? (
        <InsightPanel title="Vendas e aquisições" subtitle="Últimas contas com potencial financeiro ou assinatura ativa">
          <div className="system-toolbar">
            <label className="system-search-field">
              <Search size={16} />
              <input
                className="campaign-filter-select"
                placeholder="Buscar por cliente, plano, status ou valor"
                value={search.sales}
                onChange={(event) => setSearch((prev) => ({ ...prev, sales: event.target.value }))}
              />
            </label>
            <span className="users-role-pill">{filteredSales.length} venda(s)</span>
          </div>

          <div className="users-card-list scrollable-panel long-list-panel">
            {filteredSales.length ? (
              filteredSales.map((sale) => (
                <article key={sale.id} className="users-card">
                  <div className="users-card-head">
                    <div>
                      <strong>{sale.customerName}</strong>
                      <p>{sale.email || 'Sem e-mail'} • {sale.planName}</p>
                    </div>
                    <span className="users-role-pill">{sale.amount}</span>
                  </div>
                  <div className="users-card-tags">
                    <span className="users-role-pill">{sale.status}</span>
                    {sale.createdAt ? <span className="users-role-pill">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <article className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>Nenhuma venda encontrada</strong>
                    <p>As aquisições vinculadas ao gateway aparecerão aqui conforme entrarem na base.</p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'plans' ? (
        <div className="campaign-main-grid system-main-grid">
          <InsightPanel title="Portfólio de planos" subtitle="Exiba, oculte e gerencie cada oferta em um popup dedicado">
            <div className="system-toolbar">
              <label className="system-search-field">
                <Search size={16} />
                <input
                  className="campaign-filter-select"
                  placeholder="Buscar plano por nome, slug, copy ou base"
                  value={search.plans}
                  onChange={(event) => setSearch((prev) => ({ ...prev, plans: event.target.value }))}
                />
              </label>
              <div className="users-card-tags">
                <span className="users-role-pill">{filteredPlans.length} plano(s)</span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    handlePlanCreateMode();
                    setSelectedPlanId('__new__');
                  }}
                >
                  Novo plano
                </button>
              </div>
            </div>

            <div className="system-plan-grid">
              {filteredPlans.length ? (
                filteredPlans.map((plan) => (
                  <article key={plan.id} className={`users-card system-plan-card ${selectedPlan?.id === plan.id ? 'system-plan-selected' : ''}`}>
                    <div className="users-card-head">
                      <div>
                        <strong>{plan.title}</strong>
                        <p>{plan.price} • {plan.subtitle || 'Sem descrição comercial'}</p>
                      </div>
                      <div className="users-card-tags">
                        <button type="button" className="funnel-link-btn" onClick={() => handlePlanEdit(plan)}>
                          Editar
                        </button>
                        <button type="button" className="funnel-link-btn" onClick={() => togglePlanVisibility(plan)}>
                          {plan.visible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          type="button"
                          className="funnel-link-btn"
                          style={{ color: '#dc2626' }}
                          onClick={async () => {
                            const confirmed = window.confirm(`Deseja apagar o plano “${plan.title}”?`);
                            if (!confirmed) return;

                            try {
                              const result = await deletePlan(plan);
                              if (selectedPlanId === plan.id) handlePlanCreateMode();
                              alert(
                                result?.pendingGatewaySync
                                  ? 'Plano removido da gestão local. A exclusão no gateway ficou pendente e deverá ser sincronizada quando a Cloud Function estiver disponível.'
                                  : 'Plano apagado com sucesso.'
                              );
                            } catch (error) {
                              console.error('Erro ao apagar plano:', error);
                              alert(error.message || 'Não foi possível apagar o plano.');
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="users-card-tags">
                      <span className="users-role-pill">{plan.visible === false ? 'Oculto' : 'Visível'}</span>
                      {plan.recommended ? <span className="users-role-pill">Recomendado</span> : null}
                      {plan.status ? <span className="users-role-pill">{plan.status}</span> : null}
                    </div>
                    {plan.gatewaySyncPending ? (
                      <div className="system-inline-alert warning">
                        Sincronização com o gateway pendente. Publique as Cloud Functions para aplicar esta edição no Pagar.me.
                      </div>
                    ) : null}
                    <div className="system-inline-alert info">
                      Abra o popup de edição para revisar limites, cobrança, período de teste, gateway e demais detalhes operacionais.
                    </div>
                </article>
                ))
              ) : (
                <article className="users-card system-plan-card">
                  <div className="users-card-head">
                    <div>
                      <strong>Nenhum plano encontrado</strong>
                      <p>Refine a busca ou crie uma nova oferta pelo botão acima.</p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {activeTab === 'plans' && selectedPlanId ? (
        <div className="funnel-modal-backdrop system-user-modal-backdrop" onClick={handlePlanCreateMode}>
          <div className="funnel-modal system-user-modal system-plan-editor-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <p className="campaign-kicker">
                  <BadgeDollarSign size={16} />
                  Gestão comercial do plano
                </p>
                <h3>{planForm.mode === 'create' ? 'Novo plano' : planForm.title || 'Editar plano'}</h3>
                <p>Revise cobrança, visibilidade, limites, período de teste e integração com o gateway.</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={handlePlanCreateMode}>
                <X size={18} />
              </button>
            </div>

            {selectedPlan?.gatewaySyncPending ? (
              <div className="system-inline-alert warning">
                Sincronização com o gateway pendente. Publique as Cloud Functions para aplicar esta edição no Pagar.me.
              </div>
            ) : null}

            <form className="system-plan-form" onSubmit={submitPlan}>
              <div className="campaign-filters-grid">
                <label className="campaign-filter-field">
                  <span>Nome do plano</span>
                  <input className="campaign-filter-select" value={planForm.title} onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))} required />
                </label>
                <label className="campaign-filter-field">
                  <span>Valor do plano (centavos)</span>
                  <input className="campaign-filter-select" value={planForm.amount} onChange={(event) => setPlanForm((prev) => ({ ...prev, amount: event.target.value }))} required />
                </label>
                <label className="campaign-filter-field">
                  <span>Slug / app_id</span>
                  <input className="campaign-filter-select" value={planForm.slug} onChange={(event) => setPlanForm((prev) => ({ ...prev, slug: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Status no gateway</span>
                  <select className="campaign-filter-select" value={planForm.gatewayStatus} onChange={(event) => setPlanForm((prev) => ({ ...prev, gatewayStatus: event.target.value }))}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>
                <label className="campaign-filter-field">
                  <span>Modelo de cobrança</span>
                  <select
                    className="campaign-filter-select"
                    value={planForm.billingModel}
                    onChange={(event) => setPlanForm((prev) => ({
                      ...prev,
                      billingModel: event.target.value,
                      isFree: event.target.value === 'free' ? true : prev.isFree
                    }))}
                  >
                    <option value="recurring">Assinatura recorrente</option>
                    <option value="one_time">Pagamento único</option>
                    <option value="free">Plano gratuito</option>
                  </select>
                </label>
                <label className="campaign-filter-field">
                  <span>Recorrência</span>
                  <select
                    className="campaign-filter-select"
                    value={planForm.interval}
                    onChange={(event) => setPlanForm((prev) => ({ ...prev, interval: event.target.value }))}
                    disabled={planForm.billingModel !== 'recurring'}
                  >
                    <option value="month">Mensal</option>
                    <option value="year">Anual</option>
                    <option value="week">Semanal</option>
                  </select>
                </label>
                <label className="campaign-filter-field">
                  <span>Intervalo</span>
                  <input
                    className="campaign-filter-select"
                    value={planForm.intervalCount}
                    onChange={(event) => setPlanForm((prev) => ({ ...prev, intervalCount: event.target.value }))}
                    disabled={planForm.billingModel !== 'recurring'}
                  />
                </label>
                <label className="campaign-filter-field">
                  <span>Parcelamento máximo</span>
                  <input
                    className="campaign-filter-select"
                    value={planForm.maxInstallments}
                    onChange={(event) => setPlanForm((prev) => ({ ...prev, maxInstallments: event.target.value }))}
                    disabled={planForm.billingModel === 'free'}
                  />
                </label>
                <label className="campaign-filter-field">
                  <span>Validade em dias</span>
                  <input
                    className="campaign-filter-select"
                    value={planForm.accessDays}
                    onChange={(event) => setPlanForm((prev) => ({ ...prev, accessDays: event.target.value }))}
                    disabled={planForm.billingModel !== 'one_time'}
                    placeholder="Ex.: 30"
                  />
                </label>
                <label className="campaign-filter-field">
                  <span>Subtítulo</span>
                  <input className="campaign-filter-select" value={planForm.subtitle} onChange={(event) => setPlanForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Ideal para</span>
                  <input className="campaign-filter-select" value={planForm.ideal} onChange={(event) => setPlanForm((prev) => ({ ...prev, ideal: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Equipe</span>
                  <input className="campaign-filter-select" value={planForm.team} onChange={(event) => setPlanForm((prev) => ({ ...prev, team: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Base / limite</span>
                  <input className="campaign-filter-select" value={planForm.database} onChange={(event) => setPlanForm((prev) => ({ ...prev, database: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Teste grátis (dias)</span>
                  <input className="campaign-filter-select" value={planForm.trialDays} onChange={(event) => setPlanForm((prev) => ({ ...prev, trialDays: event.target.value }))} />
                </label>
                <label className="campaign-filter-field">
                  <span>Carência após vencimento (dias)</span>
                  <input className="campaign-filter-select" value={planForm.graceDays} onChange={(event) => setPlanForm((prev) => ({ ...prev, graceDays: event.target.value }))} />
                </label>
              </div>

              <div className="system-switch-row">
                <button type="button" className={`users-permission-chip ${(planForm.paymentMethods || []).includes('credit_card') ? 'active' : ''}`} onClick={() => togglePlanPaymentMethod('credit_card')}>
                  Cartão
                </button>
                <button type="button" className={`users-permission-chip ${(planForm.paymentMethods || []).includes('pix') ? 'active' : ''}`} onClick={() => togglePlanPaymentMethod('pix')}>
                  Pix
                </button>
                <button type="button" className={`users-permission-chip ${(planForm.paymentMethods || []).includes('boleto') ? 'active' : ''}`} onClick={() => togglePlanPaymentMethod('boleto')}>
                  Boleto
                </button>
              </div>

              <div className="system-limit-block">
                <div className="campaign-filters-header" style={{ marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#0f172a' }}>Limites operacionais do plano</h4>
                    <p style={{ margin: '6px 0 0', color: '#64748b' }}>
                      Configure os limites globais válidos para a conta proprietária e toda a equipe vinculada.
                    </p>
                  </div>
                </div>

                <div className="system-limit-grid">
                  {FEATURE_LIMIT_FIELDS.map((field) => (
                    <label key={field.key} className="campaign-filter-field">
                      <span>{field.label}</span>
                      <input
                        className="campaign-filter-select"
                        placeholder="Ex.: 100 ou Ilimitado"
                        value={planForm.featureLimits?.[field.key] || ''}
                        onChange={(event) => setPlanForm((prev) => ({
                          ...prev,
                          featureLimits: {
                            ...(prev.featureLimits || {}),
                            [field.key]: event.target.value
                          }
                        }))}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="system-switch-row">
                <button type="button" className={`users-permission-chip ${planForm.recommended ? 'active' : ''}`} onClick={() => setPlanForm((prev) => ({ ...prev, recommended: !prev.recommended }))}>
                  Plano recomendado
                </button>
                <button type="button" className={`users-permission-chip ${planForm.visible ? 'active' : ''}`} onClick={() => setPlanForm((prev) => ({ ...prev, visible: !prev.visible }))}>
                  Plano visível
                </button>
                <button
                  type="button"
                  className={`users-permission-chip ${planForm.isFree ? 'active' : ''}`}
                  onClick={() => setPlanForm((prev) => {
                    const nextFree = !prev.isFree;
                    return {
                      ...prev,
                      isFree: nextFree,
                      billingModel: nextFree ? 'free' : (prev.billingModel === 'free' ? 'recurring' : prev.billingModel)
                    };
                  })}
                >
                  Plano gratuito
                </button>
              </div>

              <div className="system-entity-grid">
                <div className="system-entity-cell">
                  <span>Modo</span>
                  <strong>{planForm.mode === 'create' ? 'Criação de oferta' : 'Edição de oferta'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Status visual</span>
                  <strong>{planForm.visible ? 'Visível no comercial' : 'Oculto no comercial'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Destaque</span>
                  <strong>{planForm.recommended ? 'Recomendado' : 'Padrão'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Teste</span>
                  <strong>{planForm.trialDays || 0} dia(s)</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Carência</span>
                  <strong>{planForm.graceDays || 5} dia(s)</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Modalidade</span>
                  <strong>{planForm.billingModel === 'one_time' ? 'Pagamento único' : planForm.billingModel === 'free' || planForm.isFree ? 'Gratuito' : 'Recorrente'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Pagamento</span>
                  <strong>{(planForm.paymentMethods || []).join(', ') || 'Não definido'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Parcelamento</span>
                  <strong>Até {planForm.maxInstallments || 1}x</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Validade</span>
                  <strong>{planForm.billingModel === 'one_time' ? `${planForm.accessDays || 0} dia(s)` : 'Contínua'}</strong>
                </div>
                <div className="system-entity-cell">
                  <span>Gateway</span>
                  <strong>{planForm.gatewayStatus || 'active'}</strong>
                </div>
              </div>

              <div className="users-card-tags system-limit-chip-row">
                {FEATURE_LIMIT_FIELDS.map((field) => (
                  <span key={field.key} className="users-role-pill">
                    {field.label}: {planForm.featureLimits?.[field.key] || 'não definido'}
                  </span>
                ))}
              </div>

              <div className="funnel-modal-actions">
                <button type="button" className="btn-secondary" onClick={handlePlanCreateMode}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : planForm.mode === 'create' ? 'Criar plano' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === 'governance' ? (
        <InsightPanel title="Governança da plataforma" subtitle="Diretrizes da central administrativa">
          <div className="system-overview-grid">
            <article className="system-overview-card">
              <strong>Conta gestora</strong>
              <p>{user?.email || 'Sem e-mail'} está operando a central total do sistema.</p>
            </article>
            <article className="system-overview-card">
              <strong>Planos públicos</strong>
              <p>Os overrides em Firestore controlam visibilidade, copy comercial e posicionamento das ofertas.</p>
            </article>
            <article className="system-overview-card">
              <strong>Assinaturas</strong>
              <p>A troca de plano aqui usa o gateway já integrado e reflete no contrato do cliente.</p>
            </article>
          </div>
        </InsightPanel>
      ) : null}

      {selectedUser ? (
        <div className="funnel-modal-backdrop system-user-modal-backdrop" onClick={() => setSelectedUserId('')}>
          <div className="funnel-modal system-user-modal" onClick={(event) => event.stopPropagation()}>
            <div className="funnel-modal-header">
              <div>
                <p className="campaign-kicker">
                  <Users size={16} />
                  Gestão da conta proprietária
                </p>
                <h3>{selectedUser.name}</h3>
                <p>{selectedUser.email || 'Sem e-mail'} • Administrador</p>
              </div>
              <button type="button" className="accountability-modal-close" onClick={() => setSelectedUserId('')}>
                <X size={18} />
              </button>
            </div>

            {selectedUser.blocked ? (
              <div className="system-inline-alert danger">
                Cobrança em atraso além da carência. O acesso desta conta deve permanecer bloqueado até regularização.
              </div>
            ) : null}

            {selectedUser.trialActive ? (
              <div className="system-inline-alert info">
                Conta em período de teste grátis até {formatDate(selectedUser.trialEndsAt)}.
              </div>
            ) : null}

            <div className="system-entity-grid">
              <div className="system-entity-cell">
                <span>ID da conta</span>
                <strong>{selectedUser.authUserId || 'Não informado'}</strong>
              </div>
              <div className="system-entity-cell">
                <span>Telefone</span>
                <strong>{selectedUser.phone || 'Não informado'}</strong>
              </div>
              <div className="system-entity-cell">
                <span>Plano atual</span>
                <strong>{selectedUser.planName || 'Sem plano'}</strong>
              </div>
              <div className="system-entity-cell">
                <span>Uso da base</span>
                <strong>{selectedUser.voterUsage || 0} eleitor(es)</strong>
              </div>
              <div className="system-entity-cell">
                <span>Equipe vinculada</span>
                <strong>{selectedUser.teamSize || 1} pessoa(s)</strong>
              </div>
              <div className="system-entity-cell">
                <span>Teste grátis</span>
                <strong>{selectedUser.trialActive ? `Até ${formatDate(selectedUser.trialEndsAt)}` : `${selectedUser.effectiveTrialDays || 0} dia(s)`}</strong>
              </div>
              <div className="system-entity-cell">
                <span>Próxima cobrança</span>
                <strong>{formatDate(selectedUser.nextBillingDate)}</strong>
              </div>
              <div className="system-entity-cell">
                <span>Carência</span>
                <strong>{selectedUser.effectiveGraceDays || 5} dia(s)</strong>
              </div>
              <div className="system-entity-cell">
                <span>Dias em atraso</span>
                <strong>{selectedUser.overdueDays || 0} dia(s)</strong>
              </div>
            </div>

            <div className="system-inline-grid">
              <label className="campaign-filter-field">
                <span>Nome do proprietário</span>
                <input
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.name || ''}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'name', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>E-mail da conta</span>
                <input
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.email || ''}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'email', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>Telefone</span>
                <input
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.phone || ''}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'phone', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>Status operacional</span>
                <select
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.status || 'Ativo'}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'status', event.target.value)}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em acompanhamento">Em acompanhamento</option>
                  <option value="Suspenso">Suspenso</option>
                </select>
              </label>
              <label className="campaign-filter-field">
                <span>Status de cobrança</span>
                <select
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.billingStatus || 'active'}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'billingStatus', event.target.value)}
                >
                  <option value="free">Gratuito</option>
                  <option value="trialing">Em teste</option>
                  <option value="active">Ativo</option>
                  <option value="pending_payment">Pagamento pendente</option>
                  <option value="overdue">Em atraso</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </label>
              <label className="campaign-filter-field">
                <span>Dias de teste</span>
                <input
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.trialDays || '0'}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'trialDays', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>Dias de carência</span>
                <input
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.graceDays || '5'}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'graceDays', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>Fim do teste</span>
                <input
                  type="date"
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.trialEndsAt || ''}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'trialEndsAt', event.target.value)}
                />
              </label>
              <label className="campaign-filter-field">
                <span>Próxima cobrança</span>
                <input
                  type="date"
                  className="campaign-filter-select"
                  value={accountDrafts[selectedUser.documentId || selectedUser.id]?.nextBillingDate || ''}
                  onChange={(event) => updateAccountDraft(selectedUser.documentId || selectedUser.id, 'nextBillingDate', event.target.value)}
                />
              </label>
            </div>

            <div className="system-card-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={async () => {
                  try {
                    await syncBillingStatus(selectedUser.documentId || selectedUser.id);
                    alert('Cobrança sincronizada com sucesso.');
                  } catch (error) {
                    console.error('Erro ao sincronizar cobrança:', error);
                    alert(error.message || 'Não foi possível sincronizar a cobrança.');
                  }
                }}
              >
                Sincronizar cobrança
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={async () => {
                  try {
                    await saveAccountProfile({
                      documentId: selectedUser.documentId || selectedUser.id,
                      payload: accountDrafts[selectedUser.documentId || selectedUser.id]
                    });
                    alert('Conta atualizada com sucesso.');
                    setSelectedUserId('');
                  } catch (error) {
                    console.error('Erro ao salvar conta:', error);
                    alert(error.message || 'Não foi possível salvar os dados da conta.');
                  }
                }}
              >
                Salvar conta
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
