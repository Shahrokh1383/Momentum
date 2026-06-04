import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/routes/user/LoginPage';
import RegisterPage from '@/routes/user/RegisterPage';
import ForgotPasswordPage from '@/routes/user/ForgotPasswordPage';
import ResetPasswordPage from '@/routes/user/ResetPasswordPage';
import VerifyEmailPage from '@/routes/user/VerifyEmailPage';
import OAuthCallbackPage from '@/routes/user/OAuthCallbackPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import '@/styles/app.css';
import '@/styles/auth.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Root Redirect - Fixes the blank screen issue */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          
          {/* Protected Routes Placeholder */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><div>Dashboard Coming Soon</div></ProtectedRoute>} 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;