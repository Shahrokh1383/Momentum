import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  
  // Prevent strict mode double-firing which ruins the one-time OAuth code
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const code = searchParams.get('code');
    const provider = window.location.pathname.split('/').pop();

    if (code && provider) {
      hasProcessed.current = true;
      
      handleOAuthCallback({ provider, code })
        .then(() => {
          if (window.opener) {
            window.opener.postMessage('oauth-success', window.location.origin);
            window.close();
          } else {
            navigate('/dashboard'); // Fallback if opened without popup
          }
        })
        .catch(() => {
          if (window.opener) {
            window.opener.postMessage('oauth-error', window.location.origin);
            window.close();
          } else {
            navigate('/login');
          }
        });
    }
  }, [searchParams, handleOAuthCallback, navigate]);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Authenticating...</span>
        </div>
        <h4>Completing authentication...</h4>
        <p className="text-muted">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;