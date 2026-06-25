import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useOAuthCallback } from '@/hooks/auth/useAuthMutations';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { provider } = useParams<{ provider: string }>();
  const { handleOAuthCallback } = useOAuthCallback();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current || !provider) return;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      hasProcessed.current = true;
      handleOAuthCallback({ provider, code, state })
        .then(() => {
          if (window.opener) { window.opener.postMessage('oauth-success', window.location.origin); window.close(); } 
          else { navigate('/dashboard'); }
        })
        .catch(() => {
          if (window.opener) { window.opener.postMessage('oauth-error', window.location.origin); window.close(); } 
          else { navigate('/login'); }
        });
    } else { navigate('/login'); }
  }, [searchParams, provider, handleOAuthCallback, navigate]);

  return <LoadingSpinner fullScreen={true} message="Completing authentication..." />;
};
export default OAuthCallbackPage;