import React from 'react';
import { usePWAStore } from '@/store/user/pwaStore';

/**
 * Persistent top banner shown whenever the user goes offline.
 * Provides clear, friendly feedback (no silent failures).
 */
const OfflineIndicator: React.FC = () => {
  const isOffline = usePWAStore((state) => state.isOffline);

  if (!isOffline) return null;

  return (
    <div className="offline-indicator" role="status" aria-live="polite">
      <i className="fas fa-wifi-slash" aria-hidden="true"></i>
      <span>You're offline — showing cached data. Changes will sync when you're back online.</span>
    </div>
  );
};

export default OfflineIndicator;