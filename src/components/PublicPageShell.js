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
  compactHero = false
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`public-shell ${compactHero ? 'compact' : ''}`}>
      <div className="public-shell-orb public-shell-orb-a" />
      <div className="public-shell-orb public-shell-orb-b" />
      <div className="public-shell-orb public-shell-orb-c" />

      <aside className="public-side-nav" aria-label="Navegacao publica">
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
      </aside>

      <main className="public-shell-content">
        <section className="public-hero-card">
          <div className="public-hero-topbar">
            <div className="public-brand-pill">
              <img src={AppIcon} alt="oAssessor" className="public-brand-icon" />
              <div>
                <strong>oAssessor</strong>
                <span>Campaign OS</span>
              </div>
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
    </div>
  );
}
