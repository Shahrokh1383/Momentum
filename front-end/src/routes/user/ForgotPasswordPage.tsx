import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useAuth } from '@/hooks/user/useAuth';
import { Link } from 'react-router-dom';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

const ForgotPasswordPage = () => {
  const { forgotPassword, isForgotPasswordLoading } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    await forgotPassword(data.email);
    setSuccessMessage('If the email exists, reset instructions have been sent.');
  };

  return (
    <AuthLayout title="Forgot Password?" subtitle="No worries. Enter your email and we will send you reset instructions.">
      <div className="dev-note">
        <i className="fas fa-code mt-1"></i>
        <div>
          <strong>Developer Note:</strong><br />
          In this simulated environment, retrieve the reset token directly from the <code>sent_emails_log</code> database table.
        </div>
      </div>

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : (
        <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="form-floating mb-4">
            <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" placeholder="name@example.com" {...register('email')} />
            <label htmlFor="email">Email address</label>
            <div className="invalid-feedback">{errors.email?.message}</div>
          </div>

          <button type="submit" className="btn btn-momentum mb-3" disabled={isForgotPasswordLoading}>
            {isForgotPasswordLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className="text-center mt-3">
        <Link to="/login"><i className="fas fa-arrow-left me-1"></i> Back to Login</Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;