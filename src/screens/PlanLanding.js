import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import Logo from '../assets/logomarca.png';

export default function PlanLanding() {
  const { id } = useParams();
  const navigate = useNavigate();

  const plansData = {
    basico: {
      title: "PLANO BÁSICO",
      subtitle: "(Vereador / Inicial)",
      price: "R$ 99,90/mês",
      description: "Ideal para candidatos a vereador em cidades pequenas ou lideranças iniciando a construção de base.",
      features: [
        "Até 3 Assessores na sua equipe",
        "Cadastre até 2.000 Eleitores",
        "App de Cadastro Rápido com GPS",
        "Mapa simples (visualização de pontos)",
        "Suporte via E-mail"
      ]
    },
    profissional: {
      title: "PLANO PROFISSIONAL",
      subtitle: "(Prefeito / Crescimento)",
      price: "R$ 299,90/mês",
      description: "Ideal para candidatos a prefeito, vereadores em capitais ou campanhas que precisam de inteligência geográfica.",
      features: [
        "Até 15 Assessores na sua equipe",
        "Cadastre até 20.000 Eleitores",
        "Mapas de Calor (Heatmaps)",
        "Gestão de Metas e Ranking",
        "App do Eleitor",
        "Suporte Prioritário via Chat"
      ]
    },
    estrategico: {
      title: "PLANO ESTRATÉGICO",
      subtitle: "(Majoritária / Comitê Central)",
      price: "Sob Consulta",
      description: "Ideal para Deputados (Estaduais/Federais), Senadores ou grandes comitês partidários.",
      features: [
        "50+ Assessores (Ilimitado sob consulta)",
        "Eleitores Ilimitados",
        "Inteligência de Dados (BI)",
        "Segmentação Avançada",
        "API Aberta para Integrações",
        "Gestor de Conta Dedicado"
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
      <header className="hero-section" style={{ height: '50vh', minHeight: '400px', position: 'relative' }}>
         <button 
            onClick={() => navigate('/')} 
            style={{ 
                position: 'absolute', 
                top: '30px', 
                left: '30px', 
                background: 'rgba(255,255,255,0.1)', 
                border: '1px solid rgba(255,255,255,0.2)', 
                color: 'white', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(4px)'
            }}
         >
            <ArrowLeft size={18} /> Voltar
         </button>
        <div className="logo-container">
          <span className="logo-text"><img src={Logo} alt="Logo" className='logo-img' style={{ height: '120px', marginTop: '0' }} /></span>
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
          
          <div style={{ textAlign: 'left', display: 'inline-block', background: '#f8fafc', padding: '30px', borderRadius: '16px', width: '100%', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>O que está incluído:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                {plan.features.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569' }}>
                    <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: '500' }}>{feature}</span>
                </div>
                ))}
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', maxWidth: '400px', padding: '20px', fontSize: '1.2rem', borderRadius: '12px' }}
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