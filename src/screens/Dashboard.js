import React, { useState } from 'react';
import { 
  User, 
  Menu, 
  Search,
  Bell
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Team from './Team';
import Agenda from './Agenda';
import Voters from './Voters';
import Profile from './Profile';
import Notifications from './Notifications';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="dashboard-container">
      {/* --- Sidebar (Menu Lateral) --- */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen} 
        toggleMenu={toggleMobileMenu} 
      />

      {/* --- Conteúdo Principal --- */}
      <main className="dashboard-content">
        {/* Topbar Mobile & Desktop */}
        <header className="dashboard-topbar">
          <button className="menu-toggle-btn" onClick={toggleMobileMenu}>
            <Menu size={24} />
          </button>
          <h2 className="page-title">{activeTab}</h2>
          
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Buscar..." />
            </div>
            <button className="icon-btn" onClick={() => setActiveTab('Notificações')}>
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
            <div className="user-avatar-sm">
              <User size={20} />
            </div>
          </div>
        </header>

        {/* Área Dinâmica */}
        <div className="content-area">
          {activeTab === 'Inicio' && (
            <>
              <div className="dashboard-card welcome-card">
                <h3>Bem-vindo ao Painel, Candidato!</h3>
                <p>Aqui está o resumo da sua campanha hoje.</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total de Eleitores</h4>
                  <div className="stat-value">2.450</div>
                  <span className="stat-trend positive">+12% essa semana</span>
                </div>
                <div className="stat-card">
                  <h4>Equipe Ativa</h4>
                  <div className="stat-value">14</div>
                  <span className="stat-trend">Assessores em campo</span>
                </div>
                <div className="stat-card">
                  <h4>Metas do Dia</h4>
                  <div className="stat-value">85%</div>
                  <span className="stat-trend positive">Concluídas</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Minha Equipe' && <Team />}
          
          {activeTab === 'Agenda' && <Agenda />}
          
          {activeTab === 'Eleitores' && <Voters />}
          
          {activeTab === 'Perfil' && <Profile />}

          {activeTab === 'Notificações' && <Notifications />}
        </div>
      </main>

      {/* Overlay para mobile */}
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>}
    </div>
  );
}