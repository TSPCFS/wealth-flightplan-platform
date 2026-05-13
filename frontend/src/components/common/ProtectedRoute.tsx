import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { SkipLink } from './SkipLink';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When true, requires the authenticated user to also have `is_admin === true`.
   * Non-admin authenticated users are redirected to /dashboard with the
   * `denied=admin` query flag so the dashboard can surface a friendly toast
   * (currently a no-op; the redirect itself is the signal).
   */
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user?.is_admin) {
    return <Navigate to="/dashboard?denied=admin" replace />;
  }

  // Skip link mounts once per protected page, anchored to <main id="main">
  // inside AppLayout. Visually hidden until focused.
  return (
    <>
      <SkipLink />
      {children}
    </>
  );
};
