import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../useAuth';

// Componente de carregamento simples para aguardar a verificação de auth
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
    <p style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>Carregando...</p>
  </div>
);

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Se não houver usuário, redireciona para a Home. Caso contrário, renderiza a rota filha.
  return user ? <Outlet /> : <Navigate to="/" replace />;
}