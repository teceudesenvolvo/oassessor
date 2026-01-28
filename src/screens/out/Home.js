import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { BarChart3, Users, ShieldCheck, Trophy, Zap } from 'lucide-react';
import HeroBg from '../../assets/hero-home.avif';

const GET_PLANS_URL = 'https://us-central1-oassessor-blu.cloudfunctions.net/getAppPlans';

export default function Home() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
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
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

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
      <header className="hero-section" style={{ 
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.8)), url(${HeroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
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

          {/* Seção de Impacto / Estatísticas */}
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
             <h3 className="section-title" style={{ marginTop: '0', marginBottom: '60px' }}>Resultados que Falam por Si</h3>
             <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '40px' }}>
                <div style={{ padding: '20px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><Users size={40} color="#52e085" /></div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>+2.5M</div>
                    <div style={{ color: '#64748b', fontWeight: '500' }}>Eleitores Gerenciados</div>
                </div>
                <div style={{ padding: '20px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><Trophy size={40} color="#52e085" /></div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>98%</div>
                    <div style={{ color: '#64748b', fontWeight: '500' }}>Taxa de Retenção</div>
                </div>
                <div style={{ padding: '20px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><Zap size={40} color="#52e085" /></div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>24/7</div>
                    <div style={{ color: '#64748b', fontWeight: '500' }}>Suporte Especializado</div>
                </div>
             </div>
          </div>

          {/* Seção de Diferenciais Detalhados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginBottom: '100px', textAlign: 'left' }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}><BarChart3 color="#2563eb"/> Inteligência de Dados</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Transforme planilhas confusas em dashboards claros. Tome decisões baseadas em fatos, não em suposições.</p>
              </div>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}><Users color="#2563eb"/> Gestão de Equipe</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Monitore o desempenho dos seus assessores em tempo real. Saiba quem está trabalhando e onde.</p>
              </div>
              <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}><ShieldCheck color="#2563eb"/> Segurança LGPD</h3>
                  <p style={{ color: '#64748b', lineHeight: '1.6' }}>Seus dados blindados. Nossa plataforma segue rigorosamente todas as normas de proteção de dados.</p>
              </div>
          </div>

          

          {/* CTA Final */}
          <div style={{ 
              backgroundColor: '#0f172a', 
              borderRadius: '24px', 
              padding: '60px 40px', 
              textAlign: 'center', 
              color: 'white',
              marginBottom: '40px'
          }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Sua vitória começa com organização</h2>
              <p style={{ marginBottom: '30px', color: '#94a3b8' }}>Não deixe para a última hora. Organize sua base, mobilize sua equipe e vença.</p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/plans')}>Conheça nossos planos</button>
          </div>

          <h3 className="section-title">Nossos Planos</h3>
          <div style={{ marginBottom: '100px' }}>
            {loadingPlans && <div style={{ textAlign: 'center', padding: '40px' }}>Carregando planos...</div>}
            {!loadingPlans && plans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px' }}>Nenhum plano disponível no momento.</div>
            )}
            <Splide options={{
              perPage: 3,
              gap: '2rem',
              breakpoints: {
                1024: { perPage: 2 },
                640: { perPage: 1 },
              },
              pagination: true,
              arrows: true,
              type: 'loop'
            }} aria-label="Nossos Planos">
            {plans.map((plan, index) => (
              <SplideSlide key={index}>
                <div className="team-card" style={{ textAlign: 'left', alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                  <h4 style={{ margin: 0, color: '#2563eb' }}>{plan.title}</h4>
                  <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#555' }}>{plan.subtitle}</span>
                  
                  <p style={{ fontSize: '0.95em', margin: '10px 0' }}><strong>Ideal para:</strong> {plan.ideal}</p>
                  
                  <p style={{ margin: 0 }}><strong>Equipe:</strong> {plan.team}</p>
                  <p style={{ margin: 0 }}><strong>Base de Dados:</strong> {plan.database}</p>
                  <input 
                    type='button' 
                    value='Conhecer Plano' 
                    className='btn-primary' 
                    style={{ marginTop: '30px' }} 
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  />
                </div>
              </SplideSlide>
            ))}
            </Splide>
          </div>
        </section>
      </main>
    </>
  );
}