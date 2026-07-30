import React from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { AlertTriangle, ArrowUpCircle, Ban, CreditCard, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../useAuth';
import { useSubscriptionCenter } from '../../hooks/useSubscriptionCenter';
import InsightPanel from '../../components/dashboard/InsightPanel';
import MetricCard from '../../components/dashboard/MetricCard';

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

export default function SubscriptionCenter() {
  const { user } = useAuth();
  const {
    loading,
    actionLoading,
    plans,
    invoices,
    usage,
    summary,
    currentPlan,
    changePlan,
    cancelSubscription,
    reload
  } = useSubscriptionCenter(user);

  const handleChangePlan = async (plan) => {
    const label = plan.changeType === 'upgrade' ? 'upgrade' : plan.changeType === 'downgrade' ? 'downgrade' : 'alteração';
    if (!window.confirm(`Deseja confirmar o ${label} para o plano ${plan.title}?`)) return;

    try {
      await changePlan(plan.id);
      alert(`Plano alterado com sucesso para ${plan.title}.`);
    } catch (error) {
      console.error('Erro ao alterar plano:', error);
      alert(error.message || 'Não foi possível alterar o plano.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Deseja cancelar a assinatura atual?')) return;
    try {
      await cancelSubscription();
      alert('Assinatura cancelada com sucesso.');
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      alert(error.message || 'Não foi possível cancelar a assinatura.');
    }
  };

  if (loading) {
    return <div className="dashboard-card">Carregando central de assinatura...</div>;
  }

  return (
    <div className="campaign-dashboard">
      <section className="campaign-filters-card">
        <div className="campaign-filters-header">
          <div>
            <p className="campaign-kicker">
              <CreditCard size={16} />
              Assinatura
            </p>
            <h3>Gestão de plano, limites e pagamentos</h3>
          </div>

          <button type="button" className="btn-secondary" onClick={reload} disabled={actionLoading}>
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Acompanhe o consumo do plano, veja a saúde da assinatura, revise faturas e faça upgrade ou downgrade sem sair do sistema.
        </p>
      </section>

      <div className="campaign-metrics-grid">
        <MetricCard title="Plano atual" value={summary.planName} helper={`Status: ${summary.subscriptionStatus}`} tone="highlight" />
        <MetricCard title="Cadastros usados" value={usage.voterCount} helper={usage.voterLimit ? `${usage.remainingVoters} vaga(s) restantes` : 'Plano sem limite cadastrado'} tone={usage.reached ? 'danger' : 'success'} />
        <MetricCard title="Limite de eleitores" value={usage.voterLimit || 'Ilimitado'} helper="Capacidade operacional contratada" />
        <MetricCard title="Próxima cobrança" value={formatDate(summary.nextBillingDate)} helper="Próximo ciclo da assinatura" />
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Consumo do plano" subtitle="O que já foi utilizado da sua capacidade atual">
          <div className="subscription-usage-card">
            <div className="subscription-usage-header">
              <div>
                <strong>{usage.voterCount}</strong>
                <span>cadastro(s) ativos na base monitorada</span>
              </div>
              <div className={`subscription-usage-pill ${usage.reached ? 'danger' : 'success'}`}>
                {usage.voterLimit ? `${usage.percentage}%` : 'Livre'}
              </div>
            </div>

            <div className="campaign-goal-progress" style={{ marginTop: '14px' }}>
              <div
                className="campaign-goal-progress-bar"
                style={{ width: `${usage.voterLimit ? usage.percentage : 100}%` }}
              />
            </div>

            <div className="campaign-notes-list" style={{ marginTop: '18px' }}>
              <div className="campaign-note-item">
                <strong><Users size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Base atual</strong>
                <p>{usage.voterCount} eleitor(es) contabilizados para o plano.</p>
              </div>
              <div className="campaign-note-item">
                <strong><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Capacidade contratada</strong>
                <p>{usage.voterLimit || 'Ilimitado'} cadastro(s) disponíveis na assinatura vigente.</p>
              </div>
              {usage.reached ? (
                <div className="campaign-note-item">
                  <strong><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Limite atingido</strong>
                  <p>Novos cadastros e importações serão bloqueados até o upgrade do plano.</p>
                </div>
              ) : null}
            </div>
          </div>
        </InsightPanel>

        <InsightPanel title="Pagamentos e faturas" subtitle="Saúde financeira da assinatura" compact>
          <div className="subscription-invoice-list">
            {invoices.length === 0 ? (
              <div className="campaign-empty-state">Nenhuma fatura encontrada.</div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="subscription-invoice-item">
                  <div>
                    <strong>{invoice.amount}</strong>
                    <p>{invoice.date}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`subscription-status-badge ${String(invoice.status).toLowerCase()}`}>{invoice.statusLabel}</span>
                    {invoice.boleto_url ? (
                      <a href={invoice.boleto_url} target="_blank" rel="noreferrer" className="funnel-link-btn" style={{ marginTop: '8px', display: 'inline-flex' }}>
                        Abrir link
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </InsightPanel>
      </div>

      <div className="campaign-main-grid">
        <InsightPanel title="Planos disponíveis" subtitle="Upgrade ou downgrade conforme o momento da operação">
          <div className="subscription-plans-slider">
            <Splide
              options={{
                perPage: 2,
                gap: '1rem',
                pagination: true,
                arrows: true,
                rewind: true,
                breakpoints: {
                  1180: { perPage: 1 },
                  768: { perPage: 1 }
                }
              }}
              aria-label="Planos disponíveis para assinatura"
            >
              {plans.map((plan) => {
                const isCurrent = currentPlan?.id === plan.id || summary.planId === plan.id;
                return (
                  <SplideSlide key={plan.id}>
                    <article className={`subscription-plan-card ${isCurrent ? 'current' : ''}`}>
                      <div className="subscription-plan-head">
                        <div>
                          <strong>{plan.title}</strong>
                          <span>{plan.subtitle}</span>
                        </div>
                        {isCurrent ? <span className="subscription-current-badge">Atual</span> : null}
                      </div>

                      <div className="subscription-plan-price">{plan.price}</div>
                      <p><strong>Ideal para:</strong> {plan.ideal || 'Operações recorrentes'}</p>
                      <p><strong>Capacidade:</strong> {plan.team || 'Sob consulta'}</p>
                      <p><strong>Base:</strong> {plan.database || 'Conforme contrato'}</p>

                      {!isCurrent ? (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleChangePlan(plan)}
                          disabled={actionLoading}
                          style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                        >
                          <ArrowUpCircle size={16} />
                          {plan.changeType === 'upgrade' ? 'Fazer upgrade' : 'Fazer downgrade'}
                        </button>
                      ) : null}
                    </article>
                  </SplideSlide>
                );
              })}
            </Splide>
          </div>
        </InsightPanel>

        <InsightPanel title="Administração da assinatura" subtitle="Ações sensíveis do contrato" compact>
          <div className="campaign-alert-list">
            <div className="campaign-alert-item">
              <div>
                <strong>Status da assinatura</strong>
                <p>{summary.subscriptionStatus}</p>
              </div>
            </div>
            <div className="campaign-alert-item">
              <div>
                <strong>Método de pagamento</strong>
                <p>{summary.paymentMethod === 'credit_card' ? 'Cartão de crédito' : 'Boleto'}</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              style={{ justifyContent: 'center' }}
            >
              <Ban size={16} />
              Cancelar assinatura
            </button>
          </div>
        </InsightPanel>
      </div>
    </div>
  );
}
