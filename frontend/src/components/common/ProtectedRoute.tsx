import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { SkipLink } from './SkipLink';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status } = useAuth();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
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
