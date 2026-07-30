import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo } from '../services/firestoreDatabase';
import { auth, database } from '../firebaseConfig';
import { useAuth } from '../useAuth';
import { 
  Home, 
  Users, 
  Calendar, 
  Vote, 
  User, 
  LogOut, 
  X,
  School,
  Rows3,
  Route,
  Network,
  HandHelping,
  MapPinned,
  ClipboardList,
  CalendarHeart,
  MessagesSquare,
  Map,
  ClipboardCheck,
  ReceiptText,
  Files,
  ShieldCheck,
  Settings2,
  ScrollText,
  CreditCard,
  FileUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Logo from '../assets/sidebar-app-icon.png';

export default function Sidebar({ activeTab, setActiveTab, isOpen, toggleMenu, isCollapsed = false, onToggleCollapse }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userType, setUserType] = useState(null);
  const menuGroups = [
    {
      label: 'Central',
      items: [
        { name: 'Inicio', icon: Home },
        { name: 'Eleitores', icon: Vote },
        { name: 'Funil Eleitoral', icon: Rows3 },
        { name: 'Caminho para a Vitória', icon: Route },
        { name: 'Prestação de Contas', icon: ReceiptText },
        { name: 'Relatórios', icon: Files }
      ]
    },
    {
      label: 'Operação',
      items: [
        { name: 'Lideranças', icon: Network },
        { name: 'Voluntários', icon: HandHelping },
        { name: 'Visitas', icon: MapPinned },
        { name: 'Demandas', icon: ClipboardList },
        { name: 'Eventos', icon: CalendarHeart },
        { name: 'Comunicação', icon: MessagesSquare },
        { name: 'Território', icon: Map },
        { name: 'Pesquisas', icon: ClipboardCheck },
        { name: 'Minha Equipe', icon: Users },
        { name: 'Agenda', icon: Calendar }
      ]
    },
    {
      label: 'Administração',
      items: [
        { name: 'Assinatura', icon: CreditCard },
        { name: 'Usuários', icon: ShieldCheck },
        { name: 'Central do Sistema', icon: Settings2 },
        { name: 'Auditoria', icon: ScrollText },
        { name: 'Importação', icon: FileUp },
        { name: 'Configurações', icon: SlidersHorizontal }
      ]
    },
    {
      label: 'Mapas e utilitários',
      items: [
        { name: 'Mapa de Colégios', icon: School },
        { name: 'Perfil', icon: User }
      ]
    }
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

  const filteredMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.name === 'Auditoria') return userType === 'admin';
        if (item.name === 'Configurações') return userType === 'admin';
        if (item.name === 'Central do Sistema') return String(user?.email || '').toLowerCase() === 'leo@gmail.com';
        return !(userType === 'assessor' && item.name === 'Minha Equipe');
      })
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src={Logo} alt="Logo" className="sidebar-logo" />
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggleCollapse} aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button className="close-menu-btn" onClick={toggleMenu}>
          <X size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {filteredMenuGroups.map((group) => (
          <div key={group.label} className="sidebar-group">
            <p className="sidebar-group-label">{group.label}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.name}>
                  <button 
                    className={`nav-item ${activeTab === item.name ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(item.name);
                      if (window.innerWidth <= 768) {
                        toggleMenu();
                      }
                    }}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
