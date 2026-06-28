import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '@/components/user/auth/AuthLayout';
import { useVerifyEmail, useResendVerification } from '@/hooks/auth/useAuthMutations';
import { useAuthStore } from '@/context/authStore';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const { verifyEmail, isVerifyingEmail, verifyEmailError } = useVerifyEmail();
  const { resendVerification, isResendingVerification } = useResendVerification();
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  const emailForResend = user?.email || pendingEmail;

  const hasValidLinkInUrl = searchParams.has('id') && searchParams.has('hash') && searchParams.has('expires') && searchParams.has('signature');
  const hasProcessed = useRef(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualEmailError, setManualEmailError] = useState('');

  useEffect(() => {
    if (!hasValidLinkInUrl || hasProcessed.current) return;
    hasProcessed.current = true;
    verifyEmail({ 
      id: Number(searchParams.get('id')!), 
      hash: searchParams.get('hash')!, 
      expires: Number(searchParams.get('expires')!), 
      signature: searchParams.get('signature')! 
    });
  }, [hasValidLinkInUrl, verifyEmail, searchParams]);

  const handleResend = async (emailToSend: string) => {
    setResendMessage(''); setResendError(''); setManualEmailError('');
    if (!emailToSend) { setManualEmailError('Please enter your email address to resend the verification link.'); return; }
    try {
      await resendVerification(emailToSend);
      setResendMessage('Verification email sent! Please check your inbox and spam folder.');
      if (!emailForResend) useAuthStore.getState().setPendingEmail(emailToSend);
    } catch { setResendError('Failed to resend the email. Please try again in a moment.'); }
  };

  const renderResendUI = () => (
    <>
      {!emailForResend && (
        <div className="mb-3">
          <label className="form-label text-muted-custom" style={{ fontSize: '0.875rem' }}>Email Address</label>
          <input type="email" className={`form-control ${manualEmailError ? 'is-invalid' : ''}`} placeholder="Enter the email you registered with" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
          {manualEmailError && <div className="invalid-feedback">{manualEmailError}</div>}
        </div>
      )}
      <button onClick={() => handleResend(emailForResend || manualEmail)} disabled={isResendingVerification} className="btn btn-outline-momentum mb-3" style={{ width: '100%' }}>
        {isResendingVerification ? <span className="spinner-border spinner-border-sm me-2" /> : null}
        {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
      </button>
      {resendMessage && <div className="alert alert-success mt-3">{resendMessage}</div>}
      {resendError && <div className="alert alert-danger mt-3">{resendError}</div>}
      <div className="text-center mt-3"><Link to="/login"><i className="fas fa-arrow-left me-1" /> Back to Login</Link></div>
    </>
  );

  if (hasValidLinkInUrl) {
    if (isVerifyingEmail) return (<AuthLayout title="Verifying Your Email" subtitle="Please wait a moment..."><div className="text-center py-4"><div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Verifying...</span></div><p className="text-muted-custom">We are confirming your email address.</p></div></AuthLayout>);
    if (verifyEmailError) return (<AuthLayout title="Verification Failed" subtitle="Your verification link is invalid or has expired."><div className="alert alert-danger mb-4">The link you used is no longer valid. Please request a new one.</div>{renderResendUI()}</AuthLayout>);
    return (<AuthLayout title="Verifying Your Email" subtitle="Please wait a moment..."><div className="text-center py-4"><div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Verifying...</span></div></div></AuthLayout>);
  }

  return (
    <AuthLayout title="Check Your Email" subtitle="We've sent a verification link to your inbox.">
      <div className="text-center mb-4">
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📬</div>
        <p className="text-muted-custom" style={{ lineHeight: 1.7 }}>We sent a verification email to {emailForResend ? <strong style={{ color: 'var(--text-primary)' }}>{emailForResend}</strong> : 'your email address'}. Click the link in the email to activate your account.</p>
        <p className="text-muted-custom" style={{ fontSize: '0.875rem' }}>Don't forget to check your <strong>spam</strong> or <strong>junk</strong> folder.</p>
      </div>
      {renderResendUI()}
    </AuthLayout>
  );
};
export default VerifyEmailPage;