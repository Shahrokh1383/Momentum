import React, { useState, useMemo } from 'react';
import { SubscriptionDetail } from '@/types/subscription';
import PremiumBadge from './PremiumBadge';

interface SubscriptionStatusBannerProps {
  subscription: SubscriptionDetail | null;
  isLoading: boolean;
  onCancel: () => void;
  isCancelling: boolean;
  onUpgrade?: () => void;
}

const DISMISS_KEY_PREFIX = 'dismissed_sub_';

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
  isLoading,
  onCancel,
  isCancelling,
  onUpgrade
}) => {
  const [userDismissed, setUserDismissed] = useState(false);

  const isDismissed = useMemo(() => {
    if (userDismissed) return true;
    
    if (!subscription || (subscription.status !== 'cancelled' && subscription.status !== 'expired')) {
      return false;
    }
    
    return localStorage.getItem(`${DISMISS_KEY_PREFIX}${subscription.id}`) === 'true';
  }, [subscription, userDismissed]);

  if (isLoading) {
    return <div className="subscription-banner subscription-banner--loading">Loading subscription status...</div>;
  }
  
  if (!subscription || isDismissed) return null;

  const { status, plan, expires_at, transaction_ref, latest_payment } = subscription;
  const planSlug = subscription.plan_slug || 'free';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleDismiss = () => {
    setUserDismissed(true);
    if (subscription?.id) {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${subscription.id}`, 'true');
    }
  };

  // State: Pending Payment
  if (status === 'pending_payment') {
    // Check if the user has actually visited the bank and returned
    const isWaitingForBank = latest_payment?.gateway_transaction_id != null;

    if (isWaitingForBank) {
      // TRUE Waiting State: User went to bank, we are verifying
      return (
        <div className="subscription-banner subscription-banner--pending">
          <div className="subscription-banner__icon">⏳</div>
          <div className="subscription-banner__content">
            <h4>Payment Processing</h4>
            <p>Your upgrade to <strong>{plan?.name || 'Premium'}</strong> is being verified by the payment gateway.</p>
            {transaction_ref && <span className="subscription-banner__ref">Ref: {transaction_ref}</span>}
          </div>
        </div>
      );
    }

    // ABANDONED State: User clicked upgrade but closed the modal/redirect before reaching the bank
    return (
      <div className="subscription-banner subscription-banner--warning">
        <div className="subscription-banner__icon">⚠️</div>
        <div className="subscription-banner__content">
          <h4>Payment Incomplete</h4>
          <p>You didn't complete the payment process. You can try again at any time.</p>
        </div>
        {onUpgrade && (
          <button className="btn btn-primary" onClick={onUpgrade}>
            Retry Upgrade
          </button>
        )}
      </div>
    );
  }

  // State: Active
  if (status === 'active') {
    return (
      <div className="subscription-banner subscription-banner--active">
        <div className="subscription-banner__icon">✓</div>
        <div className="subscription-banner__content">
          <div className="subscription-banner__header">
            <h4>Active Subscription</h4>
            <PremiumBadge planSlug={planSlug} />
          </div>
          <p>Your plan is active. Access expires on <strong>{formatDate(expires_at)}</strong>.</p>
        </div>
        {planSlug !== 'free' && (
          <button 
            className="subscription-banner__cancel" 
            onClick={onCancel} 
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Plan'}
          </button>
        )}
      </div>
    );
  }

  // State: Cancelled or Expired
  if (status === 'cancelled' || status === 'expired') {
    const isExpired = status === 'expired';
    return (
      <div className="subscription-banner subscription-banner--inactive">
        <button className="subscription-banner__close" onClick={handleDismiss} aria-label="Dismiss">
          ✕
        </button>
        <div className="subscription-banner__icon">!</div>
        <div className="subscription-banner__content">
          <h4>{isExpired ? 'Subscription Expired' : 'Subscription Cancelled'}</h4>
          <p>
            {isExpired 
              ? 'Your premium access has ended. Upgrade to restore your features.' 
              : 'Your subscription has been cancelled. Your premium features have been immediately revoked.'}
          </p>
        </div>
        {onUpgrade && (
          <button className="btn btn-primary" onClick={onUpgrade}>
            Upgrade Now
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default SubscriptionStatusBanner;