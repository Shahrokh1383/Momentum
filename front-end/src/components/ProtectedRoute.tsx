import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';

const LoadingSpinner: React.FC = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isFetchingUser, user } = useAuth();

  if (isFetchingUser) return <LoadingSpinner />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Prevent unverified users from accessing protected routes
  if (user && !user.email_verified_at) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;