import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '../../components/Navbar';

export default function PlanLanding() {
  const { id } = useParams();
  const navigate = useNavigate();

  const plansData = {
    bronze: {
      title: "PLANO BRONZE",
      subtitle: "(Vereador / Inicial)",
      price: "R$ 499,99/mês",
      description: "Até 500 cadastros. Ideal para pequenas campanhas e lideranças locais.",
      features: [
        "Até 500 Cadastros",
        "Equipe com 5 Usuários",
        "Mapa simples (visualização de pontos)",
        "Gestão de Equipe Básica",
        "Suporte via E-mail"
      ]
    },
    prata: {
      title: "PLANO PRATA",
      subtitle: "(Prefeito / Crescimento)",
      price: "R$ 799,99/mês",
      description: "Até 1000 cadastros. Para campanhas que precisam de mais estrutura e inteligência.",
      features: [
        "Até 1000 Cadastros",
        "Equipe com 10 Usuários",
        "Agenda de atividades diárias",
        "Segmentação Avançada",
        "Relatórios de Eleitores",
        "Mapa de Eleitores"
      ]
    },
    ouro: {
      title: "PLANO OURO",
      subtitle: "(Expansão)",
      price: "R$ 999,99/mês",
      description: "Até 1500 cadastros. Ideal para campanhas competitivas com grande volume de dados.",
      features: [
        "Até 1500 Cadastros",
        "Equipe com 20 Usuários",
        "Agenda de atividades diárias",
        "Segmentação Avançada",
        "Relatórios de Eleitores",
        "Mapa de Eleitores"
      ]
    },
    
    diamante: {
      title: "PLANO DIAMANTE",
      subtitle: "(Alta Performance)",
      price: "R$ 1.299,99/mês",
      description: "Até 2000 Cadastros. Para campanhas de grande porte.",
      features: [
        "Até 2000 Cadastros",
        "Equipe com 30 Usuários",
        "Agenda de atividades diárias",
        "Segmentação Avançada",
        "Relatórios de Eleitores",
        "Mapa de Eleitores"
      ]
    },
    livre: {
      title: "PLANO SEM LIMITES",
      subtitle: "(Majoritária / Comitê Central)",
      price: "R$ 1.999,99/mês",
      description: "Plano livre. A solução definitiva para grandes comitês e partidos.",
      features: [
        "Cadastros Ilimitados",
        "Equipe com Usuários Ilimitados",
        "Agenda de atividades diárias",
        "Segmentação Avançada",
        "Relatórios de Eleitores",
        "Mapa de Eleitores"
      ]
    }
  };

  const plan = plansData[id];

  if (!plan) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Plano não encontrado</h2>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Voltar para o Início</button>
      </div>
    );
  }

  return (
    <div className="plan-landing-wrapper">
      <Navbar />
      <header className="hero-section" style={{ height: '50vh', minHeight: '400px', position: 'relative' }}>
        
        <div className="logo-container">
        </div>
        <div className="hero-content">
          <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>{plan.title}</h1>
          <p className="subtitle" style={{ fontSize: '1.2rem', opacity: 0.9 }}>{plan.subtitle}</p>
        </div>
      </header>

      <main className="content" style={{ position: 'relative', zIndex: 10, marginTop: '-80px', paddingBottom: '60px' }}>
        <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '50px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          <h2 style={{ color: '#0f172a', fontSize: '2.5rem', marginBottom: '15px' }}>{plan.price}</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '40px', lineHeight: '1.6' }}>{plan.description}</p>
          
          <div style={{ textAlign: 'left', display: 'inline-block', background: '#f8fafc', padding: '30px', borderRadius: '16px', width: '80%', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>O que está incluído:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0px' }}>
                {plan.features.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', height: '60px' }}>
                    <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: '500' }}>{feature}</span>
                </div>
                ))}
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ margin: '0 auto', width: '100%', maxWidth: '200px', padding: '10px', fontSize: '15px', borderRadius: '12px' }}
            onClick={() => navigate(`/checkout/${id}`)}
          >
            Contratar Agora
          </button>
          <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#94a3b8' }}>Garantia de 7 dias ou seu dinheiro de volta.</p>
        </div>
      </main>
    </div>
  );
}