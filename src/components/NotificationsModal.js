import React from 'react';
import { AlertCircle, Bell, CheckCircle, CheckCheck, X } from 'lucide-react';

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

const renderIcon = (type) => {
  if (type === 'alert') return <AlertCircle size={18} color="#f97316" />;
  if (type === 'success') return <CheckCircle size={18} color="#22c55e" />;
  return <Bell size={18} color="#60a5fa" />;
};

export default function NotificationsModal({ isOpen, onClose, notifications, loading, onMarkAllRead }) {
  if (!isOpen) return null;

  return (
    <div className="funnel-modal-backdrop dashboard-modal-backdrop" onClick={onClose}>
      <div className="funnel-modal notifications-modal" onClick={(event) => event.stopPropagation()}>
        <div className="funnel-modal-header">
          <div>
            <h3>Notificações</h3>
            <p>Acompanhe alertas e atualizações sem sair da tela atual.</p>
          </div>

          <div className="notifications-modal-actions">
            <button type="button" className="funnel-link-btn" onClick={onMarkAllRead}>
              <CheckCheck size={16} />
              Marcar como lidas
            </button>
            <button type="button" className="funnel-link-btn" onClick={onClose}>
              <X size={16} />
              Fechar
            </button>
          </div>
        </div>

        <div className="notifications-modal-list">
          {loading ? <div className="campaign-empty-state">Carregando notificações...</div> : null}
          {!loading && notifications.length === 0 ? (
            <div className="campaign-empty-state">Nenhuma notificação encontrada.</div>
          ) : null}

          {notifications.map((notif) => (
            <article key={notif.id} className={`notifications-modal-card ${notif.read ? 'read' : 'unread'}`}>
              <div className="notifications-modal-icon">
                {renderIcon(notif.type)}
              </div>
              <div className="notifications-modal-copy">
                <strong>{notif.title || 'Atualização'}</strong>
                <p>{notif.description || notif.text || 'Sem detalhes adicionais.'}</p>
                <span>{formatTime(notif.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
