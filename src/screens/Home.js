import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  const navigate = useNavigate();
  
  const items = [
    { 
      title: "Multi-Plataforma", 
      description: "Acesse seus dados de qualquer lugar: Web, Android ou iOS com sincronização automática." 
    },
    { 
      title: "LGPD Compliance", 
      description: "Segurança total para seus dados e conformidade rigorosa com a Lei Geral de Proteção de Dados." 
    },
    { 
      title: "Disparos Inteligentes", 
      description: "Crie campanhas de mensagens segmentadas para engajar sua base de eleitores." 
    },
    { 
      title: "Relatório", 
      description: "Acompanhe o crescimento da campanha com gráficos detalhados e métricas de desempenho." 
    },
    { 
      title: "Mapa de Eleitores", 
      description: "Visualize a distribuição geográfica dos seus votos com mapas interativos." 
    },
    { 
      title: "Alertas em Tempo Real", 
      description: "Receba notificações instantâneas sobre atividades da equipe e ocorrências em campo." 
    }
  ];

  const [text, setText] = useState('');

  useEffect(() => {
    const fullText = 'Chega de "achar". Comece a saber.';
    let index = 0;
    let isDeleting = false;
    let timeoutId;

    const type = () => {
      setText(fullText.substring(0, index));

      let typeSpeed = 100;

      if (isDeleting) {
        typeSpeed /= 2;
      }

      if (!isDeleting && index === fullText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && index === 0) {
        isDeleting = false;
        typeSpeed = 500;
      }

      if (isDeleting) {
        index--;
      } else {
        index++;
      }

      timeoutId = setTimeout(type, typeSpeed);
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  const plans = [
    {
      id: "basico",
      title: "PLANO BÁSICO",
      subtitle: "(Vereador / Inicial)",
      ideal: "Candidatos a vereador em cidades pequenas ou lideranças iniciando a construção de base.",
      team: "Até 3 Assessores na sua equipe.",
      database: "Cadastre até 2.000 Eleitores.",
    },
    {
      id: "profissional",
      title: "PLANO PROFISSIONAL",
      subtitle: "(Prefeito / Crescimento)",
      ideal: "Candidatos a prefeito, vereadores em capitais ou campanhas que precisam de inteligência geográfica.",
      team: "Até 15 Assessores nas sua equipe.",
      database: "Cadastre até 20.000 Eleitores.",
    },
    {
      id: "estrategico",
      title: "PLANO ESTRATÉGICO",
      subtitle: "(Majoritária / Comitê Central)",
      ideal: "Deputados (Estaduais/Federais), Senadores ou grandes comitês partidários.",
      team: "50+ Assessores (Ilimitado sob consulta).",
      database: "Eleitores Ilimitados (sob consulta).",
    }
  ];

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .cursor {
            animation: blink 1s step-end infinite;
          }
        `}
      </style>
      <header className="hero-section">
        <Navbar />
        <div className="logo-container">
        </div>
        <div className="hero-content">
          <p className="subtitle">Transforme dados em votos com a plataforma de inteligência eleitoral mais completa do mercado.</p>
          <h1>{text}<span className="cursor">|</span></h1>
          <p className="small-text">Não dependa mais de listas velhas ou planilhas desorganizadas.</p>
          <div className="button-group">
            <button className="btn-outline" onClick={() => navigate('/login')}>Entrar</button>
          </div>
        </div>
      </header>
      <main className="content">
        <section className="services-section">
          <div className="services-grid">
            {items.map((item, index) => (
              <div key={index} className="service-card">
                <div className="icon-placeholder"></div>
                <h4>{item.title}</h4>
                <p className="service-desc">{item.description}</p>
              </div>
            ))}
          </div>

          <h3 className="section-title">Nossos Planos</h3>
          <div className="team-grid">
            {plans.map((plan, index) => (
              <div key={index} className="team-card" style={{ textAlign: 'left', alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#2563eb' }}>{plan.title}</h4>
                <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#555' }}>{plan.subtitle}</span>
                
                <p style={{ fontSize: '0.95em', margin: '10px 0' }}><strong>Ideal para:</strong> {plan.ideal}</p>
                
                <p style={{ margin: 0 }}><strong>Equipe:</strong> {plan.team}</p>
                <p style={{ margin: 0 }}><strong>Base de Dados:</strong> {plan.database}</p>
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
        </section>
      </main>
    </>
  );
}