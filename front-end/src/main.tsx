// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import { usePWAStore } from './store/user/pwaStore'
import '@/styles/app.css'
import '@/styles/auth.css'
import '@/styles/dashboard.css'
import '@/styles/subscription.css'
import '@/styles/pwa.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New content available, updating...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('[PWA] Service Worker registered:', swUrl);
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration failed:', error);
  },
});

const initPWAListeners = () => {
  const store = usePWAStore.getState();

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  store.setIsStandalone(isStandalone);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    store.setDeferredPrompt(e as any);
  });

  window.addEventListener('online', () => store.setIsOffline(false));
  window.addEventListener('offline', () => store.setIsOffline(true));

  window.addEventListener('appinstalled', () => {
    store.setDeferredPrompt(null);
    store.setIsStandalone(true);
  });
};

initPWAListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)