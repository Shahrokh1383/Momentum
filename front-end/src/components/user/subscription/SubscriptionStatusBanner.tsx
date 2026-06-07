import React from 'react';
import { SubscriptionDetail } from '@/types/subscription';
import PremiumBadge from './PremiumBadge';

interface SubscriptionStatusBannerProps {
  subscription: SubscriptionDetail | null | undefined;
  isLoading?: boolean;
  onCancel?: () => void;
  isCancelling?: boolean;
}

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
  isLoading = false,
  onCancel,
  isCancelling = false,
}) => {
  if (isLoading) {
    return (
      <div className="subscription-banner subscription-banner--loading">
        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
        <span>Loading your subscription...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="subscription-banner subscription-banner--none">
        <div className="subscription-banner__icon">
          <i className="fas fa-crown"></i>
        </div>
        <div className="subscription-banner__content">
          <h4>Choose Your Plan</h4>
          <p>You don't have an active subscription. Select a plan below to unlock all features.</p>
        </div>
      </div>
    );
  }

  const isActive = subscription.status === 'active';
  const isCancelled = subscription.status === 'cancelled';
  const isExpired = subscription.status === 'expired';

  let message = '';
  if (isActive && subscription.expires_at) {
    const expiresDate = new Date(subscription.expires_at).toLocaleDateString();
    message = `Your subscription is active until ${expiresDate}.`;
  } else if (isActive && !subscription.expires_at) {
    message = 'You have unlimited access. Enjoy all features forever!';
  } else if (isCancelled && subscription.expires_at) {
    const expiresDate = new Date(subscription.expires_at).toLocaleDateString();
    message = `Your subscription was cancelled. Access remains until ${expiresDate}.`;
  } else if (isExpired) {
    message = 'Your subscription has expired. Renew now to regain access.';
  }

  const canCancel = isActive && subscription.plan_slug !== 'free' && !!onCancel;

  return (
    <div className={`subscription-banner ${isActive ? 'subscription-banner--active' : 'subscription-banner--inactive'}`}>
      <div className="subscription-banner__content">
        <div className="subscription-banner__header">
          <h4>Current Subscription</h4>
          <PremiumBadge planSlug={subscription.plan_slug} />
        </div>
        <p>{message}</p>
        {subscription.transaction_ref && (
          <small className="subscription-banner__ref">Ref: {subscription.transaction_ref}</small>
        )}
        {canCancel && (
          <button 
            className="subscription-banner__cancel" 
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatusBanner;