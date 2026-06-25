import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage';
import PlansPage from '@/pages/billing/PlansPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useTheme } from '@/hooks/useTheme';
import PaymentResultPage from './pages/billing/PaymentResultPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import CategoriesPage from '@/pages/taxonomy/CategoriesPage';
import HabitsPage from '@/pages/habit/HabitsPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isFetchingUser } = useCurrentUser();
  if (isFetchingUser) return <LoadingSpinner />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
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

const AppContent: React.FC = () => (<BrowserRouter><AppRoutes /></BrowserRouter>);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
export default App;