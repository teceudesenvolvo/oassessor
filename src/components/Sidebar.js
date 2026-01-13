import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { 
  Home, 
  Users, 
  Calendar, 
  Vote, 
  User, 
  LogOut, 
  X 
} from 'lucide-react';
import Logo from '../assets/logomarca-vertical.png';

export default function Sidebar({ activeTab, setActiveTab, isOpen, toggleMenu }) {
  const navigate = useNavigate();
  const menuItems = [
    { name: 'Inicio', icon: Home },
    { name: 'Minha Equipe', icon: Users },
    { name: 'Agenda', icon: Calendar },
    { name: 'Eleitores', icon: Vote },
    { name: 'Perfil', icon: User },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <img src={Logo} alt="Logo" className="sidebar-logo" />
        <button className="close-menu-btn" onClick={toggleMenu}>
          <X size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.name}>
              <button 
                className={`nav-item ${activeTab === item.name ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.name);
                  // Fecha o menu mobile ao clicar em um item, se necessário
                  if (window.innerWidth <= 768) {
                    toggleMenu();
                  }
                }}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}