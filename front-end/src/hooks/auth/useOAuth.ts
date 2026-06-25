import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/user/authService';
import { openCenteredPopup } from '@/utils/auth/oauthPopup';

export const useOAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoadingProvider, setIsLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data === 'oauth-success') {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] }).then(() => navigate('/dashboard'));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient, navigate]);

  const handleOAuth = useCallback(async (provider: 'google' | 'github') => {
    try {
      setIsLoadingProvider(provider);
      const { url } = await authService.getOAuthRedirect(provider);
      const popup = openCenteredPopup({ url });

      if (!popup || popup.closed) {
        window.location.href = url;
        return;
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setIsLoadingProvider(null);
        }
      }, 1000);
    } catch (error) {
      console.error('OAuth redirect failed', error);
      setIsLoadingProvider(null);
    }
  }, []);

  return { handleOAuth, isLoadingProvider };
};