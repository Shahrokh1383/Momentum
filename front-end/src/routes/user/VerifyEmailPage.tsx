import { useState } from 'react';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useAuth } from '@/hooks/user/useAuth';

const VerifyEmailPage = () => {
  const { user, resendVerification, isResendingVerification, devVerifyEmail, isDevVerifying } = useAuth();
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (user?.email) {
      await resendVerification(user.email);
      setMessage('Verification link has been resent!');
    }
  };

  const handleDevVerify = async () => {
    await devVerifyEmail();
  };

  return (
    <AuthLayout title="Verify Your Email" subtitle="Please check your email to verify your account.">
      <div className="dev-note mb-4">
        <i className="fas fa-code mt-1"></i>
        <div>
          <strong>Developer Note:</strong><br />
          In this simulated environment, retrieve the verification link directly from the <code>sent_emails_log</code> database table.
        </div>
      </div>
      
      {message && <div className="alert alert-success">{message}</div>}

      <button onClick={handleDevVerify} disabled={isDevVerifying} className="btn btn-momentum mb-3" style={{width: '100%'}}>
        {isDevVerifying ? 'Verifying...' : 'Verify Email (Dev)'}
      </button>

      <button onClick={handleResend} disabled={isResendingVerification} className="btn btn-outline-momentum mb-3" style={{width: '100%'}}>
        {isResendingVerification ? 'Resending...' : 'Resend Verification Email'}
      </button>
    </AuthLayout>
  );
};

export default VerifyEmailPage;