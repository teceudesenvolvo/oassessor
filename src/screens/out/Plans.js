import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const GET_PLANS_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getAppPlans';

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(GET_PLANS_URL);
        const data = await response.json();
        if (data.success) {
          setPlans(data.plans);
        } else {
          console.error("Erro ao buscar planos:", data.error);
        }
      } catch (error) {
        console.error("Falha na requisição dos planos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <>
      <header className="hero-section" style={{ minHeight: '40vh' }}>
        <Navbar />
        <div className="hero-content">
          <h1>Nossos Planos</h1>
          <p className="subtitle">Escolha a opção ideal para sua campanha</p>
        </div>
      </header>
      <main className="content" style={{ marginTop: '40px', paddingBottom: '80px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
            {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Carregando planos...</div>}
            {!loading && plans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px' }}>Nenhum plano disponível no momento.</div>
            )}
            <div className="team-grid">
            {plans.map((plan, index) => (
              <div key={index} className="team-card" style={{ 
                textAlign: 'left', 
                alignItems: 'flex-start', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px',
                position: 'relative',
                border: plan.recommended ? '2px solid #2563eb' : '2px solid transparent',
                transform: plan.recommended ? 'scale(1.05)' : 'none',
                zIndex: plan.recommended ? 1 : 'auto'
              }}>
                {plan.recommended && (
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '20px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>Recomendado</div>
                )}
                <h4 style={{ margin: 0, color: '#2563eb' }}>{plan.title}</h4>
                <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#555' }}>{plan.subtitle}</span>
                
                <p style={{ fontSize: '0.95em', margin: '10px 0' }}><strong>Ideal para:</strong> {plan.ideal}</p>
                
                <p style={{ margin: 0 }}><strong>Eleitores:</strong> {plan.team}</p>
                
                <div style={{ marginTop: '15px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{plan.price}</span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>/mês</span>
                </div>

                <input 
                  type='button' 
                  value='Selecionar Plano' 
                  className='btn-primary' 
                  style={{ marginTop: '15px' }} 
                  onClick={() => navigate(`/checkout/${plan.id}`, { state: { plan } })}
                />
              </div>
            ))}
            </div>
        </div>
      </main>
    </>
  );
}