import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';

export default function Plans() {
  const navigate = useNavigate();

  const plans = [
    {
      id: "livre",
      title: "PLANO SEM LIMITES",
      subtitle: "(Majoritária)",
      ideal: "Grandes campanhas que precisam altos números",
      team: "Cadastros Ilimitados.",
      database: "Base de Eleitores Ilimitada.",
    },
     {
      id: "diamante",
      title: "PLANO DIAMANTE",
      subtitle: "(Expansão)",
      ideal: "Campanhas competitivas com grande volume de dados.",
      team: "Até 2000 Cadastros.",
      database: "Base de Eleitores Ilimitada.",
    },
   {
      id: "ouro",
      title: "PLANO OURO",
      subtitle: "(Crescimento)",
      ideal: "Campanhas em crescimento que precisam de inteligência.",
      team: "Até 1500 Cadastros.",
      database: "Base de Eleitores Ilimitada.",
    },
    {
      id: "prata",
      title: "PLANO PRATA",
      subtitle: "(Intermediário)",
      ideal: "Campanhas que precisam de mais estrutura.",
      team: "Até 1000 Cadastros.",
      database: "Base de Eleitores Ilimitada.",
    },
    {
      id: "bronze",
      title: "PLANO BRONZE",
      subtitle: "(Inicial)",
      ideal: "Pequenas campanhas e lideranças locais.",
      team: "Até 500 Cadastros.",
      database: "Base de Eleitores Ilimitada.",
    },
  ];

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
            <div className="team-grid">
            {plans.map((plan, index) => (
              <div key={index} className="team-card" style={{ textAlign: 'left', alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#2563eb' }}>{plan.title}</h4>
                <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#555' }}>{plan.subtitle}</span>
                
                <p style={{ fontSize: '0.95em', margin: '10px 0' }}><strong>Ideal para:</strong> {plan.ideal}</p>
                
                <p style={{ margin: 0 }}><strong>Eleitores:</strong> {plan.team}</p>
                <input 
                  type='button' 
                  value='Selecionar Plano' 
                  className='btn-primary' 
                  style={{ marginTop: '30px' }} 
                  onClick={() => navigate(`/plan/${plan.id}`)}
                />
              </div>
            ))}
            </div>
        </div>
      </main>
    </>
  );
}