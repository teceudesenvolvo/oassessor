import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../useAuth';
import BrandLoader from './BrandLoader';

const LoadingSpinner = () => (
  <BrandLoader
    title="Preparando seu acesso"
    subtitle="Conferindo autenticação e organizando a melhor entrada na plataforma."
  />
);

export default function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Se houver usuário, redireciona para /dashboard. Caso contrário, renderiza a rota pública (ex: /login).
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
