import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import PublicPageShell from '../../components/PublicPageShell';
import { fetchManagedPlans } from '../../services/appPlansService';

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const managedPlans = await fetchManagedPlans({ includeHidden: false });
        setPlans(managedPlans);
      } catch (error) {
        console.error("Falha na requisição dos planos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <PublicPageShell
      activeKey="plans"
      kicker="Oferta comercial pronta para campanha real"
      title="Planos desenhados para evoluir com a operação."
      subtitle="Escolha a estrutura ideal para o tamanho da base, o ritmo da equipe e o momento da campanha."
      actions={
        <>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/')}>Voltar à landing</button>
          <button type="button" className="public-glass-btn" onClick={() => navigate('/contact')}>Falar com vendas</button>
        </>
      }
    >
      {loading && <div className="public-empty">Carregando planos...</div>}
      {!loading && plans.length === 0 && <div className="public-empty">Nenhum plano disponível no momento.</div>}

      {!loading && plans.length > 0 ? (
        <div className="public-plan-grid">
          {plans.map((plan) => (
            <article key={plan.id} className={`public-plan-card ${plan.recommended ? 'recommended' : ''}`}>
              {plan.recommended ? <span className="public-plan-recommended"><Sparkles size={14} /> Recomendado</span> : null}
              <h3>{plan.title}</h3>
              <p>{plan.subtitle}</p>

              <div className="public-plan-price">
                <strong>{plan.price}</strong>
                <span>/mês</span>
              </div>

              <div className="public-plan-meta">
                <p><strong>Ideal para:</strong> {plan.ideal}</p>
                <p><strong>Equipe:</strong> {plan.team}</p>
                <p><strong>Base:</strong> {plan.database}</p>
              </div>

              <button
                type="button"
                className="btn-primary public-primary-cta"
                style={{ marginTop: '22px' }}
                onClick={() => navigate(
                  plan.isFree || Number(plan.amount) === 0 ? `/checkout/${plan.id}` : `/plan/${plan.id}`,
                  { state: { plan } }
                )}
              >
                {plan.isFree || Number(plan.amount) === 0 ? 'Criar conta grátis' : 'Ver detalhes'}
                <ArrowRight size={18} />
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </PublicPageShell>
  );
}
