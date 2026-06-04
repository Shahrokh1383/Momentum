import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '@/components/user/auth/AuthLayout';
import PasswordInput from '@/components/user/auth/PasswordInput';
import PasswordStrengthMeter from '@/components/user/auth/PasswordStrengthMeter';
import { useAuth } from '@/hooks/user/useAuth';
import { useSearchParams, Link } from 'react-router-dom';

const resetSchema = z.object({
  token: z.string().min(1, 'Token is missing'),
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

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const { resetPassword, isResetPasswordLoading } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: searchParams.get('token') || '',
      email: searchParams.get('email') || '',
    }
  });

  const password = watch('password', '');

  const onSubmit = async (data: ResetFormData) => {
    await resetPassword(data);
  };

  return (
    <AuthLayout title="Set New Password" subtitle="Create a strong password to secure your account.">
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('token')} />
        <div className="form-floating mb-3">
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
          <label htmlFor="email">Email address</label>
          <div className="invalid-feedback">{errors.email?.message}</div>
        </div>

        <PasswordInput id="password" label="New Password" registration={register('password')} />
        <PasswordStrengthMeter password={password} />
        {errors.password && <div className="text-danger mb-3" style={{fontSize: '0.875rem', marginTop: '-0.5rem'}}>{errors.password.message}</div>}

        <div className="form-floating mb-4">
          <input type="password" className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} id="password_confirmation" placeholder="Confirm Password" {...register('password_confirmation')} />
          <label htmlFor="password_confirmation">Confirm New Password</label>
          <div className="invalid-feedback">{errors.password_confirmation?.message}</div>
        </div>

        <button type="submit" className="btn btn-momentum mb-3" disabled={isResetPasswordLoading}>
          {isResetPasswordLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Reset Password'}
        </button>
      </form>

      <div className="text-center mt-3">
        <Link to="/login"><i className="fas fa-arrow-left me-1"></i> Back to Login</Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;