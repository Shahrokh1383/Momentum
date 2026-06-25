import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import PasswordInput from '@/components/user/auth/PasswordInput';
import OAuthButtons from '@/components/user/auth/OAuthButtons';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useLogin } from '@/hooks/auth/useAuthMutations';
import { loginSchema, LoginFormData } from '@/validation/authSchema';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isFetchingUser } = useCurrentUser();
  const { login, isLoggingIn, loginError } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  if (!isFetchingUser && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue building your momentum.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(async (data) => await login(data))}>
        {loginError && <div className="alert alert-danger">Invalid credentials</div>}
        <div className="form-floating mb-3">
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
          <label htmlFor="email">Email address</label>
          <div className="invalid-feedback">{errors.email?.message}</div>
        </div>
        <div className="mb-4"><PasswordInput id="password" label="Password" registration={register('password')} /></div>
        {errors.password && <div className="text-danger mb-3" style={{fontSize: '0.875rem', marginTop: '-0.5rem'}}>{errors.password.message}</div>}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="form-check">
            <input className="form-check-input custom-checkbox" type="checkbox" id="remember" {...register('remember')} />
            <label className="form-check-label text-muted-custom" htmlFor="remember" style={{fontSize: '0.9rem'}}>Remember me</label>
          </div>
          <Link to="/forgot-password" style={{fontSize: '0.9rem'}}>Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-momentum mb-3" disabled={isLoggingIn}>
          {isLoggingIn ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Sign In'}
        </button>
      </form>
      <OAuthButtons />
      <div className="text-center mt-4">
        <span className="text-muted-custom">Don't have an account? </span><Link to="/register">Create one now</Link>
      </div>
    </AuthLayout>
  );
};
export default LoginPage;