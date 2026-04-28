import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, needsOnboarding } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null; // ou um componente Loader
  }

  if (!isAuthenticated) {
    // Save attempted URL for redirect after login
    sessionStorage.setItem('redirectPath', location.pathname);
    // Redireciona novos acessos (não autenticados) para a pergunta de membresia
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to profile completion if profile is incomplete (except when already there)
  if (needsOnboarding && location.pathname !== '/completar-perfil') {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redireciona para o Dashboard caso o uziador não tenha permissão para esta rota específica
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
