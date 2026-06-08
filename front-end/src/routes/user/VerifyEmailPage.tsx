import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useAuth } from '@/hooks/user/useAuth';

/**
 * This page handles TWO states:
 *
 * STATE 1 — Token in URL (?token=xxx&email=xxx):
 *   User clicked the verification link in their email.
 *   We automatically call the backend to verify and redirect to dashboard.
 *
 * STATE 2 — No token in URL:
 *   User just registered and is waiting for the email.
 *   We show a "check your inbox" UI with a resend option.
 */
const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const { user, verifyEmail, isVerifyingEmail, verifyEmailError, resendVerification, isResendingVerification } = useAuth();

  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');
  const hasTokenInUrl = !!(tokenFromUrl && emailFromUrl);

  const hasProcessed = useRef(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  // STATE 1: Auto-verify when token is present in URL (user clicked email link)
  useEffect(() => {
    if (!hasTokenInUrl || hasProcessed.current) return;

    hasProcessed.current = true;
    verifyEmail({ token: tokenFromUrl!, email: emailFromUrl! });
  }, [hasTokenInUrl, tokenFromUrl, emailFromUrl, verifyEmail]);

  const handleResend = async () => {
    setResendMessage('');
    setResendError('');

    const emailToUse = emailFromUrl || user?.email;
    if (!emailToUse) return;

    try {
      await resendVerification(emailToUse);
      setResendMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch {
      setResendError('Failed to resend the email. Please try again in a moment.');
    }
  };

  // ── STATE 1: Token present — show processing/result UI ──────────────────────
  if (hasTokenInUrl) {
    if (isVerifyingEmail) {
      return (
        <AuthLayout title="Verifying Your Email" subtitle="Please wait a moment...">
          <div className="text-center py-4">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Verifying...</span>
            </div>
            <p className="text-muted-custom">We are confirming your email address.</p>
          </div>
        </AuthLayout>
      );
    }

    if (verifyEmailError) {
      return (
        <AuthLayout title="Verification Failed" subtitle="Your verification link is invalid or has expired.">
          <div className="alert alert-danger mb-4">
            The link you used is no longer valid. Please request a new one.
          </div>
          <button
            onClick={handleResend}
            disabled={isResendingVerification}
            className="btn btn-momentum mb-3"
            style={{ width: '100%' }}
          >
            {isResendingVerification ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {isResendingVerification ? 'Sending...' : 'Send New Verification Email'}
          </button>
          {resendMessage && <div className="alert alert-success mt-3">{resendMessage}</div>}
          <div className="text-center mt-3">
            <Link to="/login">
              <i className="fas fa-arrow-left me-1" /> Back to Login
            </Link>
          </div>
        </AuthLayout>
      );
    }

    // verifyEmail is processing (optimistic — spinner shown above, this handles edge cases)
    return (
      <AuthLayout title="Verifying Your Email" subtitle="Please wait a moment...">
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Verifying...</span>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── STATE 2: No token — user just registered, waiting for email ─────────────
  return (
    <AuthLayout
      title="Check Your Email"
      subtitle="We've sent a verification link to your inbox."
    >
      <div className="text-center mb-4">
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📬</div>
        <p className="text-muted-custom" style={{ lineHeight: 1.7 }}>
          We sent a verification email to{' '}
          {user?.email ? (
            <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
          ) : (
            'your email address'
          )}
          . Click the link in the email to activate your account.
        </p>
        <p className="text-muted-custom" style={{ fontSize: '0.875rem' }}>
          Don't forget to check your <strong>spam</strong> or <strong>junk</strong> folder.
        </p>
      </div>

      {resendMessage && <div className="alert alert-success">{resendMessage}</div>}
      {resendError   && <div className="alert alert-danger">{resendError}</div>}

      <button
        onClick={handleResend}
        disabled={isResendingVerification}
        className="btn btn-outline-momentum mb-3"
        style={{ width: '100%' }}
      >
        {isResendingVerification ? (
          <span className="spinner-border spinner-border-sm me-2" />
        ) : null}
        {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
      </button>

      <div className="text-center mt-3">
        <Link to="/login">
          <i className="fas fa-arrow-left me-1" /> Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;