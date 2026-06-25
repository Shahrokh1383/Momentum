import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import PasswordInput from '@/components/user/auth/PasswordInput';
import PasswordStrengthMeter from '@/components/user/auth/PasswordStrengthMeter';
import { useResetPassword } from '@/hooks/auth/useAuthMutations';
import { resetSchema, ResetFormData } from '@/validation/authSchema';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { resetPassword, isResetPasswordLoading } = useResetPassword();
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: tokenFromUrl || '', email: emailFromUrl || '' }
  });
  const password = watch('password', '');

  if (!tokenFromUrl || !emailFromUrl) {
    return (
      <AuthLayout title="Invalid Link" subtitle="The password reset link is invalid or missing required parameters.">
        <div className="alert alert-danger mb-3">Please ensure you clicked the correct link from your email.</div>
        <div className="text-center mt-3"><Link to="/forgot-password"><i className="fas fa-arrow-left me-1"></i> Request a new link</Link></div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set New Password" subtitle="Create a strong password to secure your account.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(async (data) => await resetPassword(data))}>
        <input type="hidden" {...register('token')} />
        <input type="hidden" {...register('email')} />
        {(errors.token || errors.email) && (<div className="alert alert-danger mb-3">{errors.token?.message && <div>{errors.token.message}</div>}{errors.email?.message && <div>{errors.email.message}</div>}</div>)}
        <PasswordInput id="password" label="New Password" registration={register('password')} />
        <PasswordStrengthMeter password={password} />
        {errors.password && <div className="text-danger mb-3" style={{fontSize: '0.875rem', marginTop: '-0.5rem'}}>{errors.password.message}</div>}
        <div className="form-floating mb-4">
          <input type="password" className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} id="password_confirmation" placeholder="Confirm Password" {...register('password_confirmation')} />
          <label htmlFor="password_confirmation">Confirm New Password</label><div className="invalid-feedback">{errors.password_confirmation?.message}</div>
        </div>
        <button type="submit" className="btn btn-momentum mb-3" disabled={isResetPasswordLoading}>
          {isResetPasswordLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Reset Password'}
        </button>
      </form>
      <div className="text-center mt-3"><Link to="/login"><i className="fas fa-arrow-left me-1"></i> Back to Login</Link></div>
    </AuthLayout>
  );
};
export default ResetPasswordPage;