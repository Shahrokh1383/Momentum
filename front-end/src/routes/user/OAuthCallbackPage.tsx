import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const provider = window.location.pathname.split('/').pop(); // Extracts 'google' or 'github'

    if (code && provider) {
      handleOAuthCallback({ provider, code })
        .then(() => {
          // Close popup on success
          window.close();
        })
        .catch(() => {
          // Handle error or close
          window.close();
        });
    }
  }, [searchParams, handleOAuthCallback]);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Authenticating...</span>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;