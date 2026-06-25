import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useForgotPassword } from '@/hooks/auth/useAuthMutations';
import { forgotSchema, ForgotFormData } from '@/validation/authSchema';

const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, isForgotPasswordLoading } = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotFormData>({ resolver: zodResolver(forgotSchema) });

  if (submitted) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset instructions have been sent.">
        <div className="text-center mb-4">
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📩</div>
          <p className="text-muted-custom" style={{ lineHeight: 1.7 }}>If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{getValues('email')}</strong>, you will receive a password reset link shortly.</p>
          <p className="text-muted-custom" style={{ fontSize: '0.875rem' }}>Don't forget to check your <strong>spam</strong> or <strong>junk</strong> folder.</p>
        </div>
        <div className="text-center mt-3"><Link to="/login"><i className="fas fa-arrow-left me-1" /> Back to Login</Link></div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password?" subtitle="Enter your email and we will send you reset instructions.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(async (data) => { await forgotPassword(data.email); setSubmitted(true); })}>
        <div className="form-floating mb-4">
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
          <label htmlFor="email">Email address</label><div className="invalid-feedback">{errors.email?.message}</div>
        </div>
        <button type="submit" className="btn btn-momentum mb-3" disabled={isForgotPasswordLoading}>
          {isForgotPasswordLoading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
          {isForgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <div className="text-center mt-3"><Link to="/login"><i className="fas fa-arrow-left me-1" /> Back to Login</Link></div>
    </AuthLayout>
  );
};
export default ForgotPasswordPage;