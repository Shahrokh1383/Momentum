import { useState, useEffect } from 'react';
import { authService } from '@/services/user/authService';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const OAuthButtons = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data === 'oauth-success') {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] }).then(() => {
          navigate('/dashboard');
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient, navigate]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      setIsLoading(provider);
      const { url } = await authService.getOAuthRedirect(provider);
      const width = 600, height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(url, 'OAuth', `width=${width},height=${height},top=${top},left=${left}`);

      // Fallback: If popup is blocked, redirect the current window
      if (!popup || popup.closed) {
        window.location.href = url;
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setIsLoading(null);
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth redirect failed', error);
      setIsLoading(null);
    }
  };

  return (
    <>
      <div className="oauth-divider">
        <span>Or continue with</span>
      </div>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('google')} disabled={!!isLoading}>
        {isLoading === 'google' ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fab fa-google"></i>} Google
      </button>
      <button type="button" className="btn-oauth" onClick={() => handleOAuth('github')} disabled={!!isLoading}>
        {isLoading === 'github' ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fab fa-github"></i>} GitHub
      </button>
    </>
  );
};

export default OAuthButtons;