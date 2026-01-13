import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../useAuth';

// Componente de carregamento simples para aguardar a verificação de auth
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
    <p style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>Carregando...</p>
  </div>
);

export default function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Se houver usuário, redireciona para /dashboard. Caso contrário, renderiza a rota pública (ex: /login).
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}