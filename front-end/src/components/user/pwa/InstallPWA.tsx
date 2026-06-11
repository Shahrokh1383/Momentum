import React from 'react';
import { usePWAStore, useIsInstallable } from '@/store/user/pwaStore';

const InstallPWA: React.FC = () => {
  const isInstallable = useIsInstallable();
  const install = usePWAStore((state) => state.install);

  if (!isInstallable) return null;

  return (
    <button 
      className="btn-install-pwa" 
      onClick={install}
      title="Install Momentum on your device"
      aria-label="Install application"
    >
      <i className="fas fa-download"></i>
      <span>Install App</span>
    </button>
  );
};

export default InstallPWA;