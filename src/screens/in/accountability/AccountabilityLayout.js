import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../../useAuth';
import { useAccountabilityCenter } from '../../../hooks/useAccountabilityCenter';
import AccountabilityHeader from '../../../components/accountability/AccountabilityHeader';
import AccountabilityTabs from '../../../components/accountability/AccountabilityTabs';

export default function AccountabilityLayout() {
  const { user } = useAuth();
  const { loading, error, summary, scope, reload } = useAccountabilityCenter(user);

  if (loading) {
    return <div className="dashboard-card">Carregando central de prestação de contas...</div>;
  }

  if (error || !summary) {
    return (
      <div className="campaign-dashboard">
        <section className="campaign-filters-card">
          <p className="campaign-kicker"><AlertCircle size={16} /> Prestação de Contas</p>
          <h3>Erro ao carregar a central</h3>
          <p style={{ margin: 0, color: '#64748b' }}>{error || 'Não foi possível iniciar a central.'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="campaign-dashboard">
      <AccountabilityHeader header={summary.header} checks={summary.checks} onReload={reload} />
      <AccountabilityTabs />
      <Outlet context={{ summary, scope, user, reload }} />
    </div>
  );
}
