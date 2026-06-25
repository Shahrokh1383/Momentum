import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isFetchingUser, user } = useCurrentUser();

  if (isFetchingUser) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user && !user.email_verified_at) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;