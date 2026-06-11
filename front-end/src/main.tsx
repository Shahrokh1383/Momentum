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

registerSW({
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline');
  },
});

const initPWAListeners = () => {
  const store = usePWAStore.getState();

  // Check if already installed as standalone
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
  store.setIsStandalone(isStandalone);

  // Capture beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    store.setDeferredPrompt(e as any);
  });

  // Online/Offline detection
  window.addEventListener('online', () => store.setIsOffline(false));
  window.addEventListener('offline', () => store.setIsOffline(true));

  // App installed
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