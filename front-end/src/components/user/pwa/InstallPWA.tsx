import React from 'react';
import { usePWA } from '@/hooks/user/usePWA';

const InstallPWA: React.FC = () => {
  const { isInstallable, install } = usePWA();

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