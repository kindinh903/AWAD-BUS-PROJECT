import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { tokenManager } from '../lib/tokenManager';

interface PublicAuthRouteProps {
  children: ReactNode;
}

/**
 * Route component that redirects authenticated users away from auth pages
 * (login/register) to the home page
 */
export default function PublicAuthRoute({ children }: PublicAuthRouteProps) {
  const isAuthenticated = !!tokenManager.getAccessToken();

  // If user is already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
