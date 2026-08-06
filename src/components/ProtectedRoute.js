import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { loadUserBillingProfile } from '../services/planLimits';
import BrandLoader from './BrandLoader';

const LoadingSpinner = () => (
  <BrandLoader
    title="Carregando seu ambiente"
    subtitle="Validando acesso, assinatura e dados essenciais da operação."
  />
);

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [billingLoading, setBillingLoading] = React.useState(true);
  const [blocked, setBlocked] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const checkBilling = async () => {
      if (!user) {
        if (active) setBillingLoading(false);
        return;
      }

      try {
        const profile = await loadUserBillingProfile(user);
        const isBlocked = Boolean(profile?.accountAccessStatus === 'blocked' || profile?.accessBlockedAt);
        if (active) setBlocked(isBlocked);
      } catch (error) {
        console.error('Erro ao validar acesso financeiro:', error);
        if (active) setBlocked(false);
      } finally {
        if (active) setBillingLoading(false);
      }
    };

    setBillingLoading(true);
    checkBilling();

    return () => {
      active = false;
    };
  }, [user]);

  if (loading || billingLoading) {
    return <LoadingSpinner />;
  }

  // Se não houver usuário, redireciona para a Home. Caso contrário, renderiza a rota filha.
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const allowBillingRecovery = location.pathname.startsWith('/dashboard/subscription')
    || location.pathname.startsWith('/dashboard/profile')
    || location.pathname.startsWith('/dashboard/system-center');

  if (blocked && !allowBillingRecovery) {
    return <Navigate to="/dashboard/subscription" replace />;
  }

  return <Outlet />;
}
