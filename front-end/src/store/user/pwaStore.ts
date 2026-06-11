// src/store/user/pwaStore.ts
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isOffline: boolean;
  
  // Actions
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setIsStandalone: (value: boolean) => void;
  setIsOffline: (value: boolean) => void;
  install: () => Promise<void>;
}

// Zustand store for PWA lifecycle management
export const usePWAStore = create<PWAState>((set, get) => ({
  deferredPrompt: null,
  isStandalone: false,
  isOffline: !navigator.onLine,

  setDeferredPrompt: (event) => set({ deferredPrompt: event }),
  setIsStandalone: (value) => set({ isStandalone: value }),
  setIsOffline: (value) => set({ isOffline: value }),

  install: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      set({ deferredPrompt: null });
    }
  },
}));

// Derived state helper (computed on-the-fly, not stored)
export const useIsInstallable = () => {
  const { deferredPrompt, isStandalone } = usePWAStore();
  return !!deferredPrompt && !isStandalone;
};