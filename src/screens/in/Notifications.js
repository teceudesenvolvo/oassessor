import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../firebaseConfig';
import { useAuth } from '../../useAuth';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notifRef = ref(database, 'notificacoes');
    
    // Queries para buscar notificações onde o usuário é o destinatário (userId) ou admin (adminId)
    const qUser = query(notifRef, orderByChild('userId'), equalTo(user.uid));
    const qAdmin = query(notifRef, orderByChild('adminId'), equalTo(user.uid));
    
    let notifsByUser = {};
    let notifsByAdmin = {};

    const updateList = () => {
      const combined = { ...notifsByUser, ...notifsByAdmin };
      const list = Object.keys(combined).map(key => ({ id: key, ...combined[key] }));
      
      // Ordenar por data (mais recente primeiro)
      list.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setNotifications(list);
      setLoading(false);
    };

    const unsubscribeUser = onValue(qUser, (snapshot) => {
      notifsByUser = snapshot.val() || {};
      updateList();
    });

    const unsubscribeAdmin = onValue(qAdmin, (snapshot) => {
      notifsByAdmin = snapshot.val() || {};
      updateList();
    });

    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, [user]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="dashboard-card">
      <h3>Notificações</h3>
      <div style={{ marginTop: '20px' }}>
        {loading && <p>Carregando...</p>}
        {!loading && notifications.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhuma notificação encontrada.</p>
        )}
        {notifications.map(notif => (
          <div key={notif.id} style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            padding: '15px', 
            borderBottom: '1px solid #f1f5f9',
            gap: '15px'
          }}>
            <div style={{ marginTop: '2px' }}>
              {notif.type === 'alert' && <AlertCircle size={20} color="#ef4444" />}
              {notif.type === 'success' && <CheckCircle size={20} color="#10b981" />}
              {(notif.type === 'info' || !notif.type) && <Bell size={20} color="#3b82f6" />}
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#334155', fontWeight: '600' }}>{notif.title}</p>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem' }}>{notif.description || notif.text}</p>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{formatTime(notif.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}