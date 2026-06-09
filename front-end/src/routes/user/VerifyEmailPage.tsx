import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useAuth } from '@/hooks/user/useAuth';

/**
 * This page handles TWO states:
 *
 * STATE 1 — Signed URL parameters in URL (?id=xxx&hash=xxx&expires=xxx&signature=xxx):
 *   User clicked the verification link in their email.
 *   We automatically call the backend to verify and redirect to dashboard.
 *
 * STATE 2 — No parameters in URL:
 *   User just registered and is waiting for the email.
 *   We show a "check your inbox" UI with a resend option.
 */
const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const {
    user,
    verifyEmail,
    isVerifyingEmail,
    verifyEmailError,
    resendVerification,
    isResendingVerification,
  } = useAuth();

  // A valid verification link must have all 4 signed URL parameters present.
  // We validate by checking each key individually so the condition is clear.
  const hasValidLinkInUrl =
    searchParams.has('id') &&
    searchParams.has('hash') &&
    searchParams.has('expires') &&
    searchParams.has('signature');

  const hasProcessed = useRef(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  // STATE 1: Auto-verify when signed URL parameters are present.
  //
  // WHY rawQueryString: We must forward the query string to the backend in
  // the exact byte order that Laravel produced when it signed the URL.
  // Decomposing params into individual variables and re-serializing them
  // via { params: {...} } lets JS object key order corrupt the HMAC input.
  // Using location.search (the raw browser query string) eliminates that risk.
  useEffect(() => {
    if (!hasValidLinkInUrl || hasProcessed.current) return;

    hasProcessed.current = true;

    // window.location.search is "?expires=...&hash=...&id=...&signature=..."
    // We strip the leading "?" to get the raw query string.
    const rawQueryString = window.location.search.slice(1);

    verifyEmail({ rawQueryString });
  }, [hasValidLinkInUrl, verifyEmail]);

  const handleResend = async () => {
    setResendMessage('');
    setResendError('');

    const emailToUse = user?.email;
    if (!emailToUse) {
      setResendError('Unable to determine your email address. Please log in and try again.');
      return;
    }

    try {
      await resendVerification(emailToUse);
      setResendMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch {
      setResendError('Failed to resend the email. Please try again in a moment.');
    }
  };

  // ── STATE 1: Signed URL present — show processing/result UI ──────────────────
  if (hasValidLinkInUrl) {
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
        <AuthLayout
          title="Verification Failed"
          subtitle="Your verification link is invalid or has expired."
        >
          <div className="alert alert-danger mb-4">
            The link you used is no longer valid. Please request a new one.
          </div>
          {user?.email && (
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
          )}
          {resendMessage && <div className="alert alert-success mt-3">{resendMessage}</div>}
          {resendError && <div className="alert alert-danger mt-3">{resendError}</div>}
          <div className="text-center mt-3">
            <Link to="/login">
              <i className="fas fa-arrow-left me-1" /> Back to Login
            </Link>
          </div>
        </AuthLayout>
      );
    }

    // Mutation fired but not yet settled — keep showing spinner
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

  // ── STATE 2: No signed URL — user just registered, waiting for email ─────────
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
      {resendError && <div className="alert alert-danger">{resendError}</div>}

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