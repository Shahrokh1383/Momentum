// src/context/user/pwaStore.tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  isStandalone: boolean;
  isOffline: boolean;
  install: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// SRP: This provider is solely responsible for managing the PWA lifecycle globally.
export const PWAProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true
      );
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event globally so it isn't lost on route change
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleAppInstalled = () => setDeferredPrompt(null);

    // DRY: Listeners attached once at the root level
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const value = {
    isInstallable: !!deferredPrompt && !isStandalone,
    isStandalone,
    isOffline,
    install,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};

// Custom hook to consume the context easily
export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};