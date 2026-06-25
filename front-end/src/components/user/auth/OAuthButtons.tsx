import React from 'react';
import { useOAuth } from '@/hooks/auth/useOAuth';

const OAuthButtons: React.FC = () => {
  const { handleOAuth, isLoadingProvider } = useOAuth();

  return (
    <>
      <div className="oauth-divider"><span>Or continue with</span></div>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('google')} disabled={!!isLoadingProvider}>
        {isLoadingProvider === 'google' ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fab fa-google"></i>} Google
      </button>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('github')} disabled={!!isLoadingProvider}>
        {isLoadingProvider === 'github' ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fab fa-github"></i>} GitHub
      </button>
    </>
  );
};

export default OAuthButtons;