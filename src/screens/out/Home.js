import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarDays,
  ClipboardCheck,
  Crown,
  FileBarChart,
  GitBranch,
  Home as HomeIcon,
  Layers3,
  MapPinned,
  Megaphone,
  MessagesSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  UserRoundCheck,
  Users,
  WalletCards
} from 'lucide-react';
import HeroBg from '../../assets/hero-home.avif';
import AppIcon from '../../assets/sidebar-app-icon.png';
import './Home.css';
import { fetchManagedPlans } from '../../services/appPlansService';

const featureCards = [
  {
    icon: BrainCircuit,
    title: 'Inteligencia eleitoral em tempo real',
    description: 'Leia a base, priorize contatos, acompanhe equipes e corrija rota com visão operacional viva.'
  },
  {
    icon: Users,
    title: 'Coordenação de campo sem ruído',
    description: 'Organize lideranças, voluntários, tarefas, visitas e demandas em uma jornada única.'
  },
  {
    icon: ShieldCheck,
    title: 'Dados protegidos e governança',
    description: 'Histórico, auditoria, perfis de acesso e estrutura segura para operações eleitorais mais maduras.'
  }
];

const signalCards = [
  {
    icon: BarChart3,
    eyebrow: 'Decisão guiada',
    title: 'Transforme cadastro em estratégia',
    copy: 'Painéis inteligentes mostram votos prováveis, gargalos, produtividade e riscos em segundos.'
  },
  {
    icon: Bell,
    eyebrow: 'Ação imediata',
    title: 'Reaja enquanto a campanha acontece',
    copy: 'Alertas, agenda, prioridades e recortes dinâmicos para agir antes do problema crescer.'
  },
  {
    icon: Layers3,
    eyebrow: 'Operação fluida',
    title: 'Tudo conectado em um só fluxo',
    copy: 'CRM, território, comunicação, relatórios e equipe no mesmo ecossistema.'
  }
];

const proofNumbers = [
  { value: '+2.5M', label: 'eleitores organizados em operações reais' },
  { value: '98%', label: 'retenção média em contratos ativos' },
  { value: '24/7', label: 'operação disponível para campanha e equipe' }
];

const capabilityGroups = [
  {
    eyebrow: 'Estratégia eleitoral',
    title: 'Saiba onde está e o que fazer depois',
    description: 'Transforme dados da campanha em metas, prioridades e decisões diárias.',
    items: [
      { icon: BarChart3, label: 'Dashboard estratégico' },
      { icon: GitBranch, label: 'Funil eleitoral' },
      { icon: BrainCircuit, label: 'Caminho para a vitória' },
      { icon: FileBarChart, label: 'Relatórios e pesquisas' }
    ]
  },
  {
    eyebrow: 'Mobilização',
    title: 'Coordene pessoas e presença em campo',
    description: 'Conecte toda a rede de apoio e acompanhe a execução sem perder informação.',
    items: [
      { icon: Users, label: 'Lideranças e voluntários' },
      { icon: UserRoundCheck, label: 'Eleitores e equipes' },
      { icon: MapPinned, label: 'Território, visitas e mapas' },
      { icon: CalendarDays, label: 'Agenda, tarefas e eventos' }
    ]
  },
  {
    eyebrow: 'Operação integrada',
    title: 'Centralize a rotina da campanha',
    description: 'Do primeiro contato à prestação de contas, tudo permanece organizado e rastreável.',
    items: [
      { icon: MessagesSquare, label: 'Demandas e atendimentos' },
      { icon: Megaphone, label: 'Comunicação segmentada' },
      { icon: WalletCards, label: 'Prestação de contas' },
      { icon: ClipboardCheck, label: 'Auditoria e permissões' }
    ]
  }
];

const sideNavItems = [
  { id: 'landing-top', icon: HomeIcon, label: 'Topo' },
  { id: 'landing-capabilities', icon: Layers3, label: 'Possibilidades' },
  { id: 'landing-signals', icon: Search, label: 'Experiência' },
  { id: 'landing-proof', icon: Users, label: 'Resultados' },
  { id: 'landing-plans', icon: Crown, label: 'Planos' },
  { id: 'landing-cta', icon: Rocket, label: 'Começar' }
];

export default function Home() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [text, setText] = useState('');
  const [activeSection, setActiveSection] = useState('landing-top');

  useEffect(() => {
    const fullText = 'Comece grátis. Organize sua base, entenda o cenário e avance com confiança.';
    let index = 0;
    let timeoutId;

    const type = () => {
      setText(fullText.slice(0, index));
      if (index <= fullText.length) {
        index += 1;
        timeoutId = setTimeout(type, index === fullText.length ? 1800 : 38);
      } else {
        index = 0;
        timeoutId = setTimeout(type, 420);
      }
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const managedPlans = await fetchManagedPlans({ includeHidden: false });
        setPlans(managedPlans);
      } catch (error) {
        console.error('Falha na requisição dos planos:', error);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const sections = sideNavItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        threshold: [0.25, 0.45, 0.7],
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const freePlan = plans.find((plan) => plan.isFree || Number(plan.amount) === 0);

  const startFreeAccount = () => {
    if (freePlan) {
      navigate(`/checkout/${freePlan.id}`, { state: { plan: freePlan } });
      return;
    }
    navigate('/plans');
  };

  return (
    <div className="sales-landing-shell">
      <div className="sales-landing-orb sales-landing-orb-a" />
      <div className="sales-landing-orb sales-landing-orb-b" />
      <div className="sales-landing-orb sales-landing-orb-c" />

      <aside className="sales-side-nav" aria-label="Navegacao da landing page">
        {sideNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`sales-side-nav-btn ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => scrollToSection(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </aside>

      <main className="sales-landing-content">
        <section id="landing-top" className="sales-hero-panel">
          <div className="sales-hero-surface">
            <div className="sales-hero-topbar">
              <div className="sales-brand-chip">
                <img src={AppIcon} alt="oAssessor" className="sales-brand-icon" />
                <div>
                  <strong>oAssessor</strong>
                  <span>Campaign OS</span>
                </div>
              </div>

              <div className="sales-hero-actions">
                <button type="button" className="sales-free-top-action" onClick={startFreeAccount}>
                  Criar conta grátis
                </button>
                <button type="button" className="sales-glass-action" onClick={() => navigate('/login')}>
                  Entrar
                </button>
              </div>
            </div>

            <div className="sales-hero-grid">
              <div className="sales-hero-copy">
                <span className="sales-kicker">
                  <Sparkles size={16} />
                  Comece gratuitamente e organize sua campanha hoje
                </span>

                <h1>Sua campanha organizada para transformar trabalho em voto.</h1>

                <p className="sales-hero-typing">
                  {text}
                  <span className="sales-cursor">|</span>
                </p>

                <p className="sales-hero-support">
                  Crie sua conta gratuita e centralize eleitores, equipe, lideranças, agenda e estratégia em poucos minutos. Comece sem cartão e evolua quando sua campanha precisar.
                </p>

                <div className="sales-hero-cta">
                  <button type="button" className="btn-primary sales-primary-cta" onClick={startFreeAccount}>
                    Criar minha conta grátis
                    <ArrowRight size={18} />
                  </button>
                  <button type="button" className="sales-secondary-cta" onClick={() => scrollToSection('landing-signals')}>
                    Ver como funciona
                  </button>
                </div>

                <div className="sales-free-trust" aria-label="Benefícios da conta gratuita">
                  <span><CheckCircle2 size={16} /> Sem cartão</span>
                  <span><CheckCircle2 size={16} /> Ativação imediata</span>
                  <span><CheckCircle2 size={16} /> Cancele quando quiser</span>
                </div>

                <div className="sales-hero-mini-grid">
                  {proofNumbers.map((item) => (
                    <article key={item.label} className="sales-mini-stat">
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </article>
                  ))}
                </div>
              </div>

              <div className="sales-hero-visual">
                <div className="sales-floating-chip sales-chip-a">
                  <BarChart3 size={18} />
                  <span>Meta sob controle</span>
                </div>
                <div className="sales-floating-chip sales-chip-b">
                  <Bell size={18} />
                  <span>Alertas vivos</span>
                </div>
                <div className="sales-dashboard-preview">
                  <div className="sales-preview-glow" />
                  <img src={HeroBg} alt="Visual da campanha" className="sales-preview-image" />
                  <div className="sales-preview-overlay">
                    <div className="sales-preview-card sales-preview-card-main">
                      <span>Central da campanha</span>
                      <strong>1.000</strong>
                      <p>Meta eleitoral acompanhada com leitura operacional em tempo real.</p>
                    </div>
                    <div className="sales-preview-card sales-preview-card-side">
                      <span>Votos provaveis</span>
                      <strong>324</strong>
                    </div>
                    <div className="sales-preview-card sales-preview-card-bottom">
                      <span>Equipe em campo</span>
                      <p>18 visitas, 6 eventos, 12 prioridades abertas hoje.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="landing-capabilities" className="sales-section sales-capabilities-section">
          <div className="sales-section-heading sales-capabilities-heading">
            <span className="sales-kicker">
              <Layers3 size={16} />
              Uma plataforma, toda a campanha
            </span>
            <h2>Tudo o que você precisa para sair do improviso e operar com clareza.</h2>
            <p>Comece gratuitamente pelo essencial e ative novas frentes conforme sua equipe e sua base crescerem.</p>
          </div>

          <div className="sales-capability-grid">
            {capabilityGroups.map((group, groupIndex) => (
              <article key={group.title} className={`sales-capability-card sales-capability-card-${groupIndex + 1}`}>
                <span>{group.eyebrow}</span>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
                <div className="sales-capability-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label}>
                        <i><Icon size={17} /></i>
                        <strong>{item.label}</strong>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <div className="sales-capabilities-cta">
            <div>
              <strong>Veja tudo funcionando com os dados da sua própria campanha.</strong>
              <span>Crie sua conta em poucos minutos. Nenhum cartão será solicitado.</span>
            </div>
            <button type="button" className="btn-primary sales-primary-cta" onClick={startFreeAccount}>
              Experimentar gratuitamente
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section id="landing-signals" className="sales-section">
          <div className="sales-section-heading">
            <span className="sales-kicker">
              <Search size={16} />
              Experiencia de alto impacto
            </span>
            <h2>Comece pelo essencial e descubra uma forma mais simples de conduzir a campanha.</h2>
          </div>

          <div className="sales-signals-grid">
            {signalCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className={`sales-signal-card sales-signal-card-${index + 1}`}>
                  <div className="sales-signal-icon">
                    <Icon size={20} />
                  </div>
                  <span>{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              );
            })}
          </div>

          <div className="sales-feature-stack">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="sales-feature-card">
                  <div className="sales-feature-icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="landing-proof" className="sales-section">
          <div className="sales-proof-panel">
            <div className="sales-section-heading">
              <span className="sales-kicker">
                <Users size={16} />
                Prova social e musculatura operacional
              </span>
              <h2>Você não precisa esperar a campanha crescer para começar a organizá-la.</h2>
              <p>Abra sua conta gratuita, conheça a plataforma com seus próprios dados e dê o próximo passo somente quando fizer sentido.</p>
            </div>

            <div className="sales-proof-grid">
              {proofNumbers.map((item) => (
                <article key={item.label} className="sales-proof-card">
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="landing-plans" className="sales-section">
          <div className="sales-section-heading">
            <span className="sales-kicker">
              <Crown size={16} />
              Oferta comercial
            </span>
            <h2>Comece grátis. Faça upgrade apenas quando sua operação crescer.</h2>
          </div>

          <div className="sales-plans-shell">
            {loadingPlans && <div className="sales-loading-card">Carregando planos...</div>}
            {!loadingPlans && plans.length === 0 && (
              <div className="sales-loading-card">Nenhum plano disponivel no momento.</div>
            )}

            {!loadingPlans && plans.length > 0 ? (
              <Splide
                options={{
                  perPage: 3,
                  gap: '1.4rem',
                  breakpoints: {
                    1100: { perPage: 2 },
                    780: { perPage: 1 }
                  },
                  pagination: true,
                  arrows: true,
                  type: 'loop'
                }}
                aria-label="Planos da plataforma"
              >
                {plans.map((plan) => (
                  <SplideSlide key={plan.id}>
                    <article className={`sales-plan-card ${plan.recommended ? 'recommended' : ''}`}>
                      {plan.recommended ? <span className="sales-plan-badge">Recomendado</span> : null}
                      <div className="sales-plan-top">
                        <h3>{plan.title}</h3>
                        <p>{plan.subtitle}</p>
                      </div>

                      <div className="sales-plan-price">
                        <strong>{plan.price}</strong>
                        <span>/mes</span>
                      </div>

                      <div className="sales-plan-meta">
                        <p><strong>Ideal para:</strong> {plan.ideal}</p>
                        <p><strong>Equipe:</strong> {plan.team}</p>
                        <p><strong>Base:</strong> {plan.database}</p>
                      </div>

                      <button
                        type="button"
                        className="btn-primary sales-plan-cta"
                        onClick={() => {
                          if (plan.isFree || Number(plan.amount) === 0) {
                            navigate(`/checkout/${plan.id}`, { state: { plan } });
                            return;
                          }
                          navigate(`/plan/${plan.id}`, { state: { plan } });
                        }}
                      >
                        {plan.isFree || Number(plan.amount) === 0 ? 'Criar conta grátis' : 'Ver plano'}
                      </button>
                    </article>
                  </SplideSlide>
                ))}
              </Splide>
            ) : null}
          </div>
        </section>

        <section id="landing-cta" className="sales-section">
          <div className="sales-final-cta">
            <div>
              <span className="sales-kicker">
                <Rocket size={16} />
                Seu primeiro passo é gratuito
              </span>
              <h2>Crie sua central de campanha agora e comece com clareza desde o primeiro cadastro.</h2>
              <p>
                Não precisa de cartão e não há compromisso. Sua conta fica pronta para organizar a base, definir metas e convidar a equipe.
              </p>
            </div>

            <div className="sales-final-actions">
              <button type="button" className="btn-primary sales-primary-cta" onClick={startFreeAccount}>
                Começar gratuitamente
                <ArrowRight size={18} />
              </button>
              <button type="button" className="sales-secondary-cta" onClick={() => navigate('/contact')}>
                Falar com consultoria
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
