import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  Menu,
  Bell
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTransition, setShowTransition] = useState(() => {
    return !sessionStorage.getItem('dashboard_welcome_shown');
  });
   
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    if (showTransition) {
      // Remove o elemento de transição do DOM após a animação e marca como visto
      const timer = setTimeout(() => {
        setShowTransition(false);
        sessionStorage.setItem('dashboard_welcome_shown', 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showTransition]);

  // Sincroniza a aba ativa com a URL atual
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/team')) setActiveTab('Minha Equipe');
    else if (path.includes('/agenda')) setActiveTab('Agenda');
    else if (path.includes('/voters')) setActiveTab('Eleitores');
    else if (path.includes('/profile')) setActiveTab('Perfil');
    else if (path.includes('/notifications')) setActiveTab('Notificações');
    else setActiveTab('Inicio');
  }, [location]);

  // Função para navegar quando clicar no Sidebar
  const handleNavigation = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'Inicio') navigate('/dashboard');
    else if (tabName === 'Minha Equipe') navigate('/dashboard/team');
    else if (tabName === 'Agenda') navigate('/dashboard/agenda');
    else if (tabName === 'Eleitores') navigate('/dashboard/voters');
    else if (tabName === 'Perfil') navigate('/dashboard/profile');
    else if (tabName === 'Notificações') navigate('/dashboard/notifications');
  };

  return (
    <div className="dashboard-container">
      {/* Animação de Entrada (Círculo diminuindo) */}
      {showTransition && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '20px',
          height: '20px',
          backgroundColor: '#4ADE80',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%) scale(250)',
          animation: 'shrinkCircle 0.8s forwards',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <style>{`
            @keyframes shrinkCircle {
              0% { transform: translate(-50%, -50%) scale(250); }
              100% { transform: translate(-50%, -50%) scale(0); }
            }
          `}</style>
        </div>
      )}

      {/* --- Sidebar (Menu Lateral) --- */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleNavigation} 
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
          <h2 className="page-title"> </h2>
          
          <div className="topbar-actions">
            
            <button className="icon-btn" onClick={() => handleNavigation('Notificações')}>
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
          <Outlet />
        </div>
      </main>

      {/* Overlay para mobile */}
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>}
    </div>
  );
}