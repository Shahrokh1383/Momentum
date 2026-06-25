import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import PasswordInput from '@/components/user/auth/PasswordInput';
import PasswordStrengthMeter from '@/components/user/auth/PasswordStrengthMeter';
import OAuthButtons from '@/components/user/auth/OAuthButtons';
import { useRegister } from '@/hooks/auth/useAuthMutations';
import { registerSchema, RegisterFormData } from '@/validation/authSchema';
import { handleLaravelValidationErrors } from '@/utils/auth/errorHandler';

const RegisterPage: React.FC = () => {
  const { registerUser, isRegistering } = useRegister();
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });
  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    try { await registerUser(data); } 
    catch (error) { handleLaravelValidationErrors(error, setError, { email: 'email' }); }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Start your journey to better habits today.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="form-floating mb-3">
          <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} id="name" placeholder="Full Name" {...register('name')} />
          <label htmlFor="name">Full Name</label><div className="invalid-feedback">{errors.name?.message}</div>
        </div>
        <div className="form-floating mb-3">
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
          <label htmlFor="email">Email address</label><div className="invalid-feedback">{errors.email?.message}</div>
        </div>
        <PasswordInput id="password" label="Password" registration={register('password')} />
        <PasswordStrengthMeter password={password} />
        {errors.password && <div className="text-danger mb-3" style={{fontSize: '0.875rem', marginTop: '-0.5rem'}}>{errors.password.message}</div>}
        <div className="form-floating mb-4">
          <input type="password" className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} id="password_confirmation" placeholder="Confirm Password" {...register('password_confirmation')} />
          <label htmlFor="password_confirmation">Confirm Password</label><div className="invalid-feedback">{errors.password_confirmation?.message}</div>
        </div>
        <button type="submit" className="btn btn-momentum mb-3" disabled={isRegistering}>
          {isRegistering ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Create Account'}
        </button>
      </form>
      <OAuthButtons />
      <div className="text-center mt-4">
        <span className="text-muted-custom">Already have an account? </span><Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
};
export default RegisterPage;