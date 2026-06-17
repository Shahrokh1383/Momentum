import { useEffect } from 'react';
import { useAuth } from '@/hooks/user/useAuth';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const { user } = useAuth();

  useEffect(() => {
    const getSystemTheme = (): 'light' | 'dark' => 
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const applyTheme = (theme: Theme) => {
      const actualTheme = theme === 'system' ? getSystemTheme() : theme;
      document.documentElement.setAttribute('data-theme', actualTheme);
      // Save to local storage so unauthenticated pages (Auth pages) remember the choice
      localStorage.setItem('app-theme', theme);
    };

    // Priority: 1. User DB Settings, 2. LocalStorage, 3. System Default
    const activeTheme: Theme = user?.settings?.theme || 
                               (localStorage.getItem('app-theme') as Theme) || 
                               'system';

    applyTheme(activeTheme);

    // If the theme is 'system', listen for OS-level theme changes
    if (activeTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [user]);
};