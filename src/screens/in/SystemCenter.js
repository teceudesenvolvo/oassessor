import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Blocks,
  Eye,
  EyeOff,
  LayoutDashboard,
  RefreshCcw,
  Settings2,
  Shield,
  Users
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
  recommended: false,
  visible: true,
  gatewayStatus: 'active',
  slug: ''
};

export default function SystemCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedCustomerPlan, setSelectedCustomerPlan] = useState({});
  const [limitDrafts, setLimitDrafts] = useState({});
  const [planForm, setPlanForm] = useState(INITIAL_PLAN_FORM);

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
    reload,
    togglePlanVisibility,
    savePlan,
    changeCustomerPlan,
    updateCustomerLimit
  } = useSystemCenter(user);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
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
      recommended: Boolean(plan.recommended),
      visible: plan.visible !== false,
      gatewayStatus: plan.status || 'active',
      slug: plan.id
    });
  };

  const handlePlanCreateMode = () => {
    setSelectedPlanId('');
    setPlanForm(INITIAL_PLAN_FORM);
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
      alert(error.message || 'Não foi possível salvar o plano.');
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
        <MetricCard title="Planos visíveis" value={summary.activePlans} helper="Ofertas ativas no comercial" />
        <MetricCard title="Planos ocultos" value={summary.hiddenPlans} helper="Ofertas preservadas sem exibição pública" />
      </div>

      {activeTab === 'overview' ? (
        <div className="campaign-main-grid system-main-grid">
          <InsightPanel title="Radar operacional" subtitle="Onde agir primeiro para manter tração comercial e controle da plataforma">
            <div className="campaign-alert-list">
              <div className="campaign-alert-item">
                <div>
                  <strong>Base administrada</strong>
                  <p>{users.length} conta(s) sob gestão direta.</p>
                </div>
              </div>
              <div className="campaign-alert-item">
                <div>
                  <strong>Clientes monetizados</strong>
                  <p>{customers.length} conta(s) com plano, customer ou assinatura cadastrada.</p>
                </div>
              </div>
              <div className="campaign-alert-item">
                <div>
                  <strong>Portfólio de planos</strong>
                  <p>{plans.length} plano(s) sincronizados entre gateway e override comercial.</p>
                </div>
              </div>
            </div>
          </InsightPanel>

          <InsightPanel title="Distribuição por plano" subtitle="Quantos clientes estão concentrados em cada oferta" compact>
            <div className="users-card-list">
              {planDistribution.map((plan) => (
                <article key={plan.id} className="users-card">
                  <div className="users-card-head">
                    <div>
                      <strong>{plan.title}</strong>
                      <p>{plan.price} • {plan.visible === false ? 'Oculto' : 'Visível'}</p>
                    </div>
                    <span className="users-role-pill">{plan.customers} cliente(s)</span>
                  </div>
                </article>
              ))}
            </div>
          </InsightPanel>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <InsightPanel title="Usuários do sistema" subtitle="Controle global de acesso, papel e vínculo comercial">
          <div className="users-card-list">
            {users.map((entry) => (
              <article key={entry.id} className="users-card">
                <div className="users-card-head">
                  <div>
                    <strong>{entry.name}</strong>
                    <p>{entry.email || 'Sem e-mail'} • {entry.role}</p>
                  </div>
                  <div className="users-card-tags">
                    <span className="users-role-pill">{entry.status}</span>
                    {entry.planName ? <span className="users-role-pill">{entry.planName}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'clients' ? (
        <InsightPanel title="Clientes e assinaturas" subtitle="Troque planos e ajuste limites por conta">
          <div className="users-card-list">
            {customers.map((entry) => (
              <article key={entry.id} className="users-card system-customer-card">
                <div className="users-card-head">
                  <div>
                    <strong>{entry.name}</strong>
                    <p>{entry.email || 'Sem e-mail'} • {entry.planName || 'Sem plano vinculado'}</p>
                  </div>
                  <span className="users-role-pill">{entry.subscriptionStatus || entry.status}</span>
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
                    <span>Limite de eleitores</span>
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
            ))}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'sales' ? (
        <InsightPanel title="Vendas e aquisições" subtitle="Últimas contas com potencial financeiro ou assinatura ativa">
          <div className="users-card-list">
            {sales.map((sale) => (
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
            ))}
          </div>
        </InsightPanel>
      ) : null}

      {activeTab === 'plans' ? (
        <div className="campaign-main-grid system-main-grid">
          <InsightPanel title="Portfólio de planos" subtitle="Exiba, oculte e selecione uma oferta para edição">
            <div className="users-card-list">
              {plans.map((plan) => (
                <article key={plan.id} className={`users-card ${selectedPlan?.id === plan.id ? 'system-plan-selected' : ''}`}>
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
                    </div>
                  </div>
                  <div className="users-card-tags">
                    <span className="users-role-pill">{plan.visible === false ? 'Oculto' : 'Visível'}</span>
                    {plan.recommended ? <span className="users-role-pill">Recomendado</span> : null}
                  </div>
                </article>
              ))}
            </div>
          </InsightPanel>

          <InsightPanel title={planForm.mode === 'create' ? 'Criar novo plano' : 'Editar plano'} subtitle="Controle comercial e operacional da oferta">
            <form className="system-plan-form" onSubmit={submitPlan}>
              <div className="campaign-filters-grid">
                <label className="campaign-filter-field">
                  <span>Nome do plano</span>
                  <input className="campaign-filter-select" value={planForm.title} onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))} required />
                </label>
                <label className="campaign-filter-field">
                  <span>Valor mensal (centavos)</span>
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
              </div>

              <div className="system-switch-row">
                <button type="button" className={`users-permission-chip ${planForm.recommended ? 'active' : ''}`} onClick={() => setPlanForm((prev) => ({ ...prev, recommended: !prev.recommended }))}>
                  Plano recomendado
                </button>
                <button type="button" className={`users-permission-chip ${planForm.visible ? 'active' : ''}`} onClick={() => setPlanForm((prev) => ({ ...prev, visible: !prev.visible }))}>
                  Plano visível
                </button>
              </div>

              <div className="funnel-modal-actions">
                <button type="button" className="btn-secondary" onClick={handlePlanCreateMode}>
                  Novo plano
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : planForm.mode === 'create' ? 'Criar plano' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </InsightPanel>
        </div>
      ) : null}

      {activeTab === 'governance' ? (
        <InsightPanel title="Governança da plataforma" subtitle="Diretrizes da central administrativa">
          <div className="campaign-alert-list">
            <div className="campaign-alert-item">
              <div>
                <strong>Conta gestora</strong>
                <p>{user?.email || 'Sem e-mail'} está operando a central total do sistema.</p>
              </div>
            </div>
            <div className="campaign-alert-item">
              <div>
                <strong>Planos públicos</strong>
                <p>Os overrides em Firestore controlam visibilidade, copy comercial e posicionamento das ofertas.</p>
              </div>
            </div>
            <div className="campaign-alert-item">
              <div>
                <strong>Assinaturas</strong>
                <p>A troca de plano aqui usa o gateway já integrado e reflete no contrato do cliente.</p>
              </div>
            </div>
          </div>
        </InsightPanel>
      ) : null}
    </div>
  );
}
