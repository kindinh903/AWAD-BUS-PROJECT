import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { tokenManager } from '../lib/tokenManager';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = !!tokenManager.getAccessToken();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
