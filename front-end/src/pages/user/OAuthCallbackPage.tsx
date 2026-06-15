import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { provider } = useParams<{ provider: string }>();
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current || !provider) return;

    const code = searchParams.get('code');
    const state = sessionStorage.getItem(`oauth_state_${provider}`);

    if (code && state) {
      hasProcessed.current = true;
      
      handleOAuthCallback({ provider, code, state })
        .then(() => {
          sessionStorage.removeItem(`oauth_state_${provider}`);
          if (window.opener) {
            window.opener.postMessage('oauth-success', window.location.origin);
            window.close();
          } else {
            navigate('/dashboard');
          }
        })
        .catch(() => {
          sessionStorage.removeItem(`oauth_state_${provider}`);
          if (window.opener) {
            window.opener.postMessage('oauth-error', window.location.origin);
            window.close();
          } else {
            navigate('/login');
          }
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, provider, handleOAuthCallback, navigate]);

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