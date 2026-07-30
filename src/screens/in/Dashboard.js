import React, { useMemo, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  Menu,
  Bell,
  Moon,
  Sun
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import NotificationsModal from '../../components/NotificationsModal';
import { useAuth } from '../../useAuth';
import { ref, query, orderByChild, equalTo, onValue, update } from '../../services/firestoreDatabase';
import { database } from '../../firebaseConfig';

 
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('oassessor-sidebar-collapsed') === 'true');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('oassessor-theme') || 'light');
  const [showTransition, setShowTransition] = useState(() => {
    return !sessionStorage.getItem('dashboard_welcome_shown');
  });
   
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
 
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oassessor-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('oassessor-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
    else if (path.includes('/electoral-funnel')) setActiveTab('Funil Eleitoral');
    else if (path.includes('/victory-path')) setActiveTab('Caminho para a Vitória');
    else if (path.includes('/leaderships')) setActiveTab('Lideranças');
    else if (path.includes('/volunteers')) setActiveTab('Voluntários');
    else if (path.includes('/visits')) setActiveTab('Visitas');
    else if (path.includes('/demands')) setActiveTab('Demandas');
    else if (path.includes('/events')) setActiveTab('Eventos');
    else if (path.includes('/communication')) setActiveTab('Comunicação');
    else if (path.includes('/territory')) setActiveTab('Território');
    else if (path.includes('/research')) setActiveTab('Pesquisas');
    else if (path.includes('/reports')) setActiveTab('Relatórios');
    else if (path.includes('/ai')) setActiveTab('IA');
    else if (path.includes('/subscription')) setActiveTab('Assinatura');
    else if (path.includes('/system-center')) setActiveTab('Central do Sistema');
    else if (path.includes('/users')) setActiveTab('Usuários');
    else if (path.includes('/audit')) setActiveTab('Auditoria');
    else if (path.includes('/import')) setActiveTab('Importação');
    else if (path.includes('/settings')) setActiveTab('Configurações');
    else if (path.includes('/voters/stations-map')) setActiveTab('Mapa de Colégios');
    else if (path.includes('/voters')) setActiveTab('Eleitores');
    else if (path.includes('/vote-comparison')) setActiveTab('Comparativo 2024');
    else if (path.includes('/profile')) setActiveTab('Perfil');
    else if (path.includes('/notifications')) setActiveTab('Notificações');
    else setActiveTab('Inicio');
  }, [location]);

  // Busca a contagem de notificações não lidas
  useEffect(() => {
    if (!user) return;

    const notifRef = ref(database, 'notificacoes');
    const qUser = query(notifRef, orderByChild('userId'), equalTo(user.uid));
    const qAdmin = query(notifRef, orderByChild('adminId'), equalTo(user.uid));

    let notifsByUser = {};
    let notifsByAdmin = {};

    const updateCount = () => {
      const combined = { ...notifsByUser, ...notifsByAdmin };
      const list = Object.keys(combined)
        .map((key) => ({ id: key, ...combined[key] }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const unreadCount = list.filter((n) => !n.read).length;
      setNotifications(list);
      setNotificationCount(unreadCount);
      setNotificationsLoading(false);
    };

    const unsubUser = onValue(qUser, (snapshot) => {
      notifsByUser = snapshot.val() || {};
      updateCount();
    });

    const unsubAdmin = onValue(qAdmin, (snapshot) => {
      notifsByAdmin = snapshot.val() || {};
      updateCount();
    });

    return () => {
      unsubUser();
      unsubAdmin();
    };
  }, [user]);

  const markAllNotificationsAsRead = async () => {
    const unread = notifications.filter((item) => !item.read);
    for (const item of unread) {
      await update(ref(database, `notificacoes/${item.id}`), { read: true, readAt: new Date().toISOString() });
    }
  };

  const pageTitle = useMemo(() => {
    if (activeTab === 'Inicio') return 'Central da Campanha';
    return activeTab;
  }, [activeTab]);

  // Função para navegar quando clicar no Sidebar
  const handleNavigation = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'Inicio') navigate('/dashboard');
    else if (tabName === 'Minha Equipe') navigate('/dashboard/team');
    else if (tabName === 'Agenda') navigate('/dashboard/agenda');
    else if (tabName === 'Funil Eleitoral') navigate('/dashboard/electoral-funnel');
    else if (tabName === 'Caminho para a Vitória') navigate('/dashboard/victory-path');
    else if (tabName === 'Lideranças') navigate('/dashboard/leaderships');
    else if (tabName === 'Voluntários') navigate('/dashboard/volunteers');
    else if (tabName === 'Visitas') navigate('/dashboard/visits');
    else if (tabName === 'Demandas') navigate('/dashboard/demands');
    else if (tabName === 'Eventos') navigate('/dashboard/events');
    else if (tabName === 'Comunicação') navigate('/dashboard/communication');
    else if (tabName === 'Território') navigate('/dashboard/territory');
    else if (tabName === 'Pesquisas') navigate('/dashboard/research');
    else if (tabName === 'Relatórios') navigate('/dashboard/reports');
    else if (tabName === 'IA') navigate('/dashboard/ai');
    else if (tabName === 'Assinatura') navigate('/dashboard/subscription');
    else if (tabName === 'Central do Sistema') navigate('/dashboard/system-center');
    else if (tabName === 'Usuários') navigate('/dashboard/users');
    else if (tabName === 'Auditoria') navigate('/dashboard/audit');
    else if (tabName === 'Importação') navigate('/dashboard/import');
    else if (tabName === 'Configurações') navigate('/dashboard/settings');
    else if (tabName === 'Eleitores') navigate('/dashboard/voters');
    else if (tabName === 'Mapa de Colégios') navigate('/dashboard/voters/stations-map');
    else if (tabName === 'Comparativo 2024') navigate('/dashboard/vote-comparison');
    else if (tabName === 'Perfil') navigate('/dashboard/profile');
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
            .topbar-actions .icon-btn {
                position: relative;
            }
            .notification-dot {
                position: absolute;
                top: -5px;
                right: -5px;
                background-color: #ef4444;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                border: 2px solid white;
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* --- Conteúdo Principal --- */}
      <main className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button className="menu-toggle-btn glass-icon-btn" onClick={toggleMobileMenu}>
              <Menu size={22} />
            </button>
            <div className="dashboard-page-heading">
              <span className="dashboard-page-kicker">Workspace</span>
              <h2 className="page-title">{pageTitle}</h2>
            </div>
          </div>
          
          <div className="topbar-actions">
            <button
              className="icon-btn glass-icon-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label="Alternar tema"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button className="icon-btn glass-icon-btn" onClick={() => setIsNotificationsOpen(true)} aria-label="Abrir notificações">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="notification-dot">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            <button className="user-avatar-sm" onClick={() => navigate('/dashboard/profile')} aria-label="Abrir perfil">
              <User size={20} />
            </button>
          </div>
        </header>

        <div className="content-area">
          <Outlet />
        </div>
      </main>

      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        loading={notificationsLoading}
        onMarkAllRead={markAllNotificationsAsRead}
      />
    </div>
  );
}
