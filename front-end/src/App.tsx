import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/pages/user/LoginPage';
import RegisterPage from '@/pages/user/RegisterPage';
import ForgotPasswordPage from '@/pages/user/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/user/ResetPasswordPage';
import VerifyEmailPage from '@/pages/user/VerifyEmailPage';
import OAuthCallbackPage from '@/pages/user/OAuthCallbackPage';
import PlansPage from '@/pages/user/PlansPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/user/useAuth';
import '@/styles/app.css';
import '@/styles/auth.css';
import '@/styles/dashboard.css';
import '@/styles/subscription.css';
import '@/styles/pwa.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const DashboardPlaceholder = () => (
  <section className="dashboard-page">
    <div className="dashboard-page__welcome">
      <h1 className="dashboard-page__title">Welcome to Momentum</h1>
      <p className="dashboard-page__subtitle">
        Your dashboard is coming soon. Stay tuned for habit tracking, insights, and more.
      </p>
    </div>
  </section>
);

const RootRedirect = () => {
  const { isAuthenticated, isFetchingUser } = useAuth();

  if (isFetchingUser) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Smart root path */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<div className="auth-page-wrapper"><LoginPage /></div>} />
          <Route path="/register" element={<div className="auth-page-wrapper"><RegisterPage /></div>} />
          <Route path="/forgot-password" element={<div className="auth-page-wrapper"><ForgotPasswordPage /></div>} />
          <Route path="/reset-password" element={<div className="auth-page-wrapper"><ResetPasswordPage /></div>} />
          <Route path="/verify-email" element={<div className="auth-page-wrapper"><VerifyEmailPage /></div>} />
          <Route path="/auth/callback/:provider" element={<div className="auth-page-wrapper"><OAuthCallbackPage /></div>} />

          {/* Dashboard Routes (full-width layout) */}
          <Route element={<DashboardLayout />}>
            <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPlaceholder /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;