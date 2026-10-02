import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown, Home, Info, LogIn, Mail, Sparkles } from 'lucide-react';
import AppIcon from '../assets/sidebar-app-icon.png';
import './PublicPageShell.css';

const NAV_ITEMS = [
  { key: 'home', path: '/', icon: Home, label: 'Inicio' },
  { key: 'plans', path: '/plans', icon: Crown, label: 'Planos' },
  { key: 'about', path: '/about', icon: Info, label: 'Sobre' },
  { key: 'contact', path: '/contact', icon: Mail, label: 'Contato' },
  { key: 'login', path: '/login', icon: LogIn, label: 'Entrar' }
];

export default function PublicPageShell({
  activeKey,
  kicker,
  title,
  subtitle,
  actions,
  children,
  contentClassName = '',
  compactHero = false,
  hideNav = false,
  profile = null
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const pageColors = profile?.pageColors || {};
  const buttonColors = profile?.heroButtonColors || {};
  const heroDefaults = profile?.pageTheme === 'light'
    ? { community: { background: '#0f9f6e', text: '#ffffff' }, demand: { background: '#ffffff', text: '#0f172a' } }
    : { community: { background: '#50d59a', text: '#09203a' }, demand: { background: '#16243a', text: '#ffffff' } };
  const pageStyle = profile ? {
    '--page-background': pageColors.background || '#071326',
    '--page-card': pageColors.card || '#16243a',
    '--page-text': pageColors.text || '#f7fafc',
    '--page-muted-text': pageColors.mutedText || '#b9c5d3',
    '--page-button': pageColors.button || '#50d59a',
    '--page-button-text': pageColors.buttonText || '#09203a',
    '--demand-button': buttonColors.demand?.background || heroDefaults.demand.background,
    '--demand-button-text': buttonColors.demand?.text || heroDefaults.demand.text,
    '--community-button': buttonColors.community?.background || heroDefaults.community.background,
    '--community-button-text': buttonColors.community?.text || heroDefaults.community.text
  } : undefined;
  return (
    <div className={`public-shell ${compactHero ? 'compact' : ''} ${hideNav ? 'no-side-nav' : ''} ${profile ? `profile-themed theme-${profile.pageTheme === 'light' ? 'light' : 'dark'}` : ''}`} style={pageStyle}>
      <div className="public-shell-orb public-shell-orb-a" />
      <div className="public-shell-orb public-shell-orb-b" />
      <div className="public-shell-orb public-shell-orb-c" />

      {!hideNav ? <aside className="public-side-nav" aria-label="Navegacao publica">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey ? activeKey === item.key : location.pathname === item.path;
          return (
            <button
              key={item.key}
              type="button"
              className={`public-side-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </aside> : null}

      <main className="public-shell-content">
        <section className="public-hero-card">
          <div className="public-hero-topbar">
            <div className="public-brand-pill">
              <img src={profile?.logoUrl || AppIcon} alt={profile?.logoUrl ? (profile?.name || 'Logomarca') : 'oAssessor'} className={`public-brand-icon ${profile?.logoUrl ? 'custom-logo' : ''}`} />
              {!profile?.logoUrl ? <div>
                <strong>oAssessor</strong>
                <span>Campaign OS</span>
              </div> : null}
            </div>

            <div className="public-hero-actions">
              {actions}
            </div>
          </div>

          <div className="public-hero-copy">
            <span className="public-kicker">
              <Sparkles size={16} />
              {kicker}
            </span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </section>

        <section className={`public-content-card ${contentClassName}`.trim()}>
          {children}
        </section>
      </main>
      {hideNav ? <footer className="public-shell-copyright">Copyright © 2025 Blu Tecnologias. Todos os direitos reservados.</footer> : null}
    </div>
  );
}
