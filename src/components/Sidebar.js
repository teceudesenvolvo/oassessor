import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, database } from '../firebaseConfig';
import { useAuth } from '../useAuth';
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
  const { user } = useAuth();
  const [userType, setUserType] = useState(null);
  const menuItems = [
    { name: 'Inicio', icon: Home },
    { name: 'Eleitores', icon: Vote },
    { name: 'Minha Equipe', icon: Users },
    { name: 'Agenda', icon: Calendar },
    { name: 'Perfil', icon: User },
  ];

  useEffect(() => {
    if (user) {
      const fetchUserType = async () => {
        try {
          // Verifica se o email está na coleção 'assessores'
          if (user.email) {
            const assessoresRef = ref(database, 'assessores');
            const qEmail = query(assessoresRef, orderByChild('email'), equalTo(user.email));
            const snapshotEmail = await get(qEmail);

            if (snapshotEmail.exists()) {
              setUserType('assessor');
              return;
            }
          }

          const usersRef = ref(database, 'users');
          const qUser = query(usersRef, orderByChild('userId'), equalTo(user.uid));
          const snapshot = await get(qUser);
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            const firstKey = Object.keys(data)[0];
            setUserType(data[firstKey].tipoUser);
          } else {
            // Fallback: Se não achar em 'users', busca em 'assessores' pelo userId
            const assessoresRef = ref(database, 'assessores');
            const q = query(assessoresRef, orderByChild('userId'), equalTo(user.uid));
            const snapshotAssessor = await get(q);

            if (snapshotAssessor.exists()) {
              const data = snapshotAssessor.val();
              const firstKey = Object.keys(data)[0];
              setUserType(data[firstKey].tipoUser || 'assessor');
            }
          }
        } catch (error) {
          console.error("Erro ao buscar tipo de usuário:", error);
        }
      };
      fetchUserType();
    }
  }, [user]);

  const filteredMenuItems = menuItems.filter(item => {
    return !(userType === 'assessor' && item.name === 'Minha Equipe');
  });

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
          {filteredMenuItems.map((item) => (
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