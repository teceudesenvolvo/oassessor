import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../../components/Navbar';

const GET_PLANS_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getAppPlans';

export default function PlanLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(location.state?.plan || null);
  const [loading, setLoading] = useState(!plan);

  useEffect(() => {
    if (!plan) {
      const fetchPlan = async () => {
        try {
          const response = await fetch(GET_PLANS_URL);
          const data = await response.json();
          if (data.success) {
            const foundPlan = data.plans.find(p => p.id === id);
            if (foundPlan) {
              setPlan(foundPlan);
            } else {
              console.warn("Plano não encontrado, redirecionando.");
              navigate('/plans');
            }
          }
        } catch (error) {
          console.error("Erro ao buscar detalhes do plano:", error);
          navigate('/plans');
        } finally {
          setLoading(false);
        }
      };
      fetchPlan();
    }
  }, [id, plan, navigate]);

  if (loading) {
    return (
        <>
            <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '20px' }}>
                <Navbar />
            </header>
            <div style={{ textAlign: 'center', padding: '60px' }}>Carregando detalhes do plano...</div>
        </>
    );
  }

  if (!plan) return null;

  return (
    <>
      <header className="hero-section" style={{ minHeight: 'auto', paddingBottom: '40px' }}>
        <Navbar />
      </header>
      
      <div className="container" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        <button onClick={() => navigate('/plans')} className="btn-secondary" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ArrowLeft size={18} /> Voltar para Planos
        </button>

        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '40px' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#0f172a', marginBottom: '10px' }}>{plan.title}</h1>
                <p style={{ fontSize: '1.2rem', color: '#64748b' }}>{plan.subtitle}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'center' }}>
                <div>
                    <h3 style={{ marginBottom: '20px', color: '#334155' }}>O que está incluído:</h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={20} color="#16a34a" />
                            <span>{plan.ideal}</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={20} color="#16a34a" />
                            <span>{plan.team}</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={20} color="#16a34a" />
                            <span>{plan.database}</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={20} color="#16a34a" />
                            <span>Suporte Prioritário</span>
                        </li>
                    </ul>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b', marginBottom: '10px' }}>Valor Mensal</p>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '5px' }}>
                        {plan.price}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '30px' }}>Cancele quando quiser</p>
                    
                    <button 
                        className="btn-primary" 
                        style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: '1.1rem' }}
                        onClick={() => navigate(`/checkout/${plan.id}`, { state: { plan } })}
                    >
                        Contratar Agora
                    </button>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}