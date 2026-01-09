import React from 'react';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';

export default function Notifications() {
  const notifications = [
    { id: 1, type: 'alert', text: 'Meta de cadastros diária não atingida.', time: '2 horas atrás' },
    { id: 2, type: 'success', text: 'Novo assessor aceitou o convite.', time: '5 horas atrás' },
    { id: 3, type: 'info', text: 'Atualização do sistema agendada para 00:00.', time: '1 dia atrás' },
  ];

  return (
    <div className="dashboard-card">
      <h3>Notificações</h3>
      <div style={{ marginTop: '20px' }}>
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
              {notif.type === 'info' && <Bell size={20} color="#3b82f6" />}
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#334155', fontWeight: '500' }}>{notif.text}</p>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{notif.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}