import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import PlansPage from '@/pages/PlansPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import PaymentResultPage from './pages/PaymentResultPage';
import SettingsPage from '@/pages/SettingsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import HabitsPage from '@/pages/HabitsPage';
import DashboardPage from '@/pages/DashboardPage';

const LoadingSpinner: React.FC = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isFetchingUser } = useAuth();

  if (isFetchingUser) return <LoadingSpinner />;

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
};

/**
 * Inner component responsible for rendering routes and consuming global hooks.
 * It is rendered INSIDE both QueryClientProvider and BrowserRouter so hooks 
 * like useTheme -> useAuth have access to React Query and React Router contexts.
 */
const AppRoutes: React.FC = () => {
  // Apply global theme management - Now safely inside both Providers
  useTheme();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login"           element={<div className="auth-page-wrapper"><LoginPage /></div>} />
      <Route path="/register"        element={<div className="auth-page-wrapper"><RegisterPage /></div>} />
      <Route path="/forgot-password" element={<div className="auth-page-wrapper"><ForgotPasswordPage /></div>} />
      <Route path="/reset-password"  element={<div className="auth-page-wrapper"><ResetPasswordPage /></div>} />
      <Route path="/verify-email"    element={<div className="auth-page-wrapper"><VerifyEmailPage /></div>} />
      <Route path="/auth/callback/:provider" element={<div className="auth-page-wrapper"><OAuthCallbackPage /></div>} />

      <Route path="/payment-result" element={<ProtectedRoute><PaymentResultPage /></ProtectedRoute>} />

      <Route element={<DashboardLayout />}>
        <Route path="/plans"     element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><HabitsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

/**
 * Wrapper component to provide Router context.
 */
const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

/**
 * Root component strictly responsible for initializing top-level providers.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;