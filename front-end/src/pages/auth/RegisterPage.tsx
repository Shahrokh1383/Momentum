import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '@/components/user/auth/AuthLayout';
import PasswordInput from '@/components/user/auth/PasswordInput';
import PasswordStrengthMeter from '@/components/user/auth/PasswordStrengthMeter';
import OAuthButtons from '@/components/user/auth/OAuthButtons';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a symbol'),
  password_confirmation: z.string(),
}).refine(data => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const { registerUser, isRegistering } = useAuth();
  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      // Handle Laravel 422 Validation Errors
      if (axiosError.response?.status === 422 && axiosError.response.data?.errors) {
        const backendErrors = axiosError.response.data.errors;
        
        // Map backend email error to React Hook Form
        if (backendErrors.email) {
          setError('email', { 
            type: 'server', 
            message: backendErrors.email[0] 
          });
        }
      }
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Start your journey to better habits today.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="form-floating mb-3">
          <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} id="name" placeholder="Full Name" {...register('name')} />
          <label htmlFor="name">Full Name</label>
          <div className="invalid-feedback">{errors.name?.message}</div>
        </div>

        <div className="form-floating mb-3">
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
          <label htmlFor="email">Email address</label>
          <div className="invalid-feedback">{errors.email?.message}</div>
        </div>
        
        <PasswordInput id="password" label="Password" registration={register('password')} />
        <PasswordStrengthMeter password={password} />
        {errors.password && <div className="text-danger mb-3" style={{fontSize: '0.875rem', marginTop: '-0.5rem'}}>{errors.password.message}</div>}

        <div className="form-floating mb-4">
          <input type="password" className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} id="password_confirmation" placeholder="Confirm Password" {...register('password_confirmation')} />
          <label htmlFor="password_confirmation">Confirm Password</label>
          <div className="invalid-feedback">{errors.password_confirmation?.message}</div>
        </div>

        <button type="submit" className="btn btn-momentum mb-3" disabled={isRegistering}>
          {isRegistering ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Create Account'}
        </button>
      </form>

      <OAuthButtons />

      <div className="text-center mt-4">
        <span className="text-muted-custom">Already have an account? </span>
        <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;