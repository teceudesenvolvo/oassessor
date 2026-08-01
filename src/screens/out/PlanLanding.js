import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Crown, ShieldCheck, Sparkles, Users, Database, Headphones } from 'lucide-react';
import PublicPageShell from '../../components/PublicPageShell';
import { fetchManagedPlans } from '../../services/appPlansService';

const fallbackBenefits = [
  {
    icon: Crown,
    title: 'Estrutura premium de campanha',
    description: 'Um ambiente completo para operar a campanha com mais previsibilidade, leitura e governança.'
  },
  {
    icon: ShieldCheck,
    title: 'Mais controle e segurança',
    description: 'Fluxos organizados, acessos estruturados e visão centralizada para reduzir ruído na operação.'
  },
  {
    icon: Headphones,
    title: 'Suporte prioritário',
    description: 'Atendimento pensado para o ritmo real da campanha, com mais proximidade nas decisões críticas.'
  }
];

export default function PlanLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(location.state?.plan || null);
  const [loading, setLoading] = useState(!plan);

  useEffect(() => {
    if (plan) return;

    const fetchPlan = async () => {
      try {
        const managedPlans = await fetchManagedPlans({ includeHidden: false });
        const foundPlan = managedPlans.find((item) => item.id === id);
        if (foundPlan) {
          setPlan(foundPlan);
        } else {
          navigate('/plans');
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do plano:', error);
        navigate('/plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, navigate, plan]);

  const planHighlights = useMemo(() => {
    if (!plan) return [];

    return [
      {
        icon: Sparkles,
        label: 'Ideal para',
        value: plan.ideal || 'Campanhas que exigem leitura e execução com mais profundidade'
      },
      {
        icon: Users,
        label: 'Equipe',
        value: plan.team || 'Estrutura de equipe personalizada para a operação'
      },
      {
        icon: Database,
        label: 'Base',
        value: plan.database || 'Escala flexível para crescer com a campanha'
      },
      {
        icon: ShieldCheck,
        label: 'Suporte',
        value: 'Prioritário e orientado à operação'
      }
    ];
  }, [plan]);

  if (loading) {
    return (
      <PublicPageShell
        activeKey="plans"
        compactHero
        kicker="Oferta comercial premium"
        title="Carregando os detalhes do plano"
        subtitle="Estamos preparando a visão completa da oferta escolhida."
        actions={
          <>
            <button type="button" className="public-glass-btn" onClick={() => navigate('/plans')}>Voltar aos planos</button>
            <button type="button" className="public-glass-btn" onClick={() => navigate('/contact')}>Falar com vendas</button>
          </>
        }
      >
        <div className="public-empty">Carregando detalhes do plano...</div>
      </PublicPageShell>
    );
  }

  if (!plan) return null;

  return (
    <PublicPageShell
      activeKey="plans"
      compactHero
      kicker={`Oferta ${plan.recommended ? 'recomendada' : 'premium'} para operação eleitoral`}
      title={`${plan.title} para campanhas que querem mais leitura, mais cadência e mais controle.`}
      subtitle={plan.subtitle || 'Uma estrutura comercial pensada para equipes que precisam crescer sem perder clareza operacional.'}
      actions={
        <>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/plans')}>
            <ArrowLeft size={16} />
            Voltar aos planos
          </button>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/contact')}>Falar com vendas</button>
        </>
      }
      contentClassName="public-plan-landing-content"
    >
      <div className="public-plan-landing-grid">
        <section className={`public-plan-landing-hero ${plan.recommended ? 'recommended' : ''}`}>
          <div className="public-plan-landing-head">
            <span className="public-plan-landing-badge">
              <Crown size={16} />
              {plan.recommended ? 'Mais escolhido' : 'Plano premium'}
            </span>
            <div className="public-plan-landing-price">
              <span>Investimento mensal</span>
              <strong>{plan.price}</strong>
              <small>Cancele quando quiser e ajuste conforme a campanha evoluir.</small>
            </div>
          </div>

          <div className="public-plan-landing-cta">
            <button
              type="button"
              className="btn-primary public-primary-cta"
              onClick={() => navigate(`/checkout/${plan.id}`, { state: { plan } })}
            >
              Contratar agora
              <ArrowRight size={18} />
            </button>
            <button type="button" className="public-glass-btn" onClick={() => navigate('/plans')}>
              Comparar outros planos
            </button>
          </div>

          <div className="public-plan-landing-feature-grid">
            {planHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="public-plan-landing-feature">
                  <div className="public-plan-landing-feature-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="public-plan-landing-side">
          <article className="public-plan-landing-panel">
            <h2>O que está incluído</h2>
            <div className="public-plan-landing-checks">
              {[
                plan.ideal,
                plan.team,
                plan.database,
                'Suporte prioritário para a operação',
                'Ambiente pronto para evoluir com a campanha'
              ].filter(Boolean).map((item) => (
                <div key={item} className="public-plan-landing-check">
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="public-plan-landing-panel">
            <h2>Por que esse plano acelera</h2>
            <div className="public-plan-landing-benefits">
              {fallbackBenefits.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="public-plan-landing-benefit">
                    <div className="public-plan-landing-benefit-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </PublicPageShell>
  );
}
