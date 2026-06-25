import React from 'react';
import { SubscriptionDetail } from '@/types/subscription';
import PremiumBadge from './PremiumBadge';
import { useDismissable } from '@/hooks/billing/useDismissable';

interface SubscriptionStatusBannerProps {
  subscription: SubscriptionDetail | null;
  isLoading: boolean;
  onCancel: () => void;
  isCancelling: boolean;
  onUpgrade?: () => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(new Date(dateStr));
};

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
  isLoading,
  onCancel,
  isCancelling,
  onUpgrade
}) => {
  // 1. Hooks must be called unconditionally at the top level
  const dismissKey = subscription?.id ? `dismissed_sub_${subscription.id}` : 'dismissed_sub_unknown';
  const { isDismissed, dismiss } = useDismissable(dismissKey);

  // 2. Explicit null/loading check (TypeScript successfully narrows the type here)
  if (isLoading || !subscription) return null;

  // 3. Dismiss logic for terminal states
  const isDismissableStatus = ['cancelled', 'expired', 'payment_failed'].includes(subscription.status);
  if (isDismissableStatus && isDismissed) return null;

  // 4. Safe destructuring (TS now guarantees subscription is NOT null)
  const { status, plan, expires_at, transaction_ref, latest_payment } = subscription;
  const planSlug = subscription.plan_slug || 'free';

  // ── RENDERING LOGIC ───────────────────────────────────────────────────────

  if (status === 'pending_payment') {
    const isWaitingForBank = latest_payment?.gateway_transaction_id != null;

    if (isWaitingForBank) {
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

    return (
      <div className="subscription-banner subscription-banner--warning">
        <div className="subscription-banner__icon">⚠️</div>
        <div className="subscription-banner__content">
          <h4>Payment Incomplete</h4>
          <p>You didn't complete the payment process. You can try again at any time.</p>
        </div>
        {onUpgrade && (
          <button className="btn btn-primary" onClick={onUpgrade}>Retry Upgrade</button>
        )}
      </div>
    );
  }

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
          <button className="subscription-banner__cancel" onClick={onCancel} disabled={isCancelling}>
            {isCancelling ? 'Cancelling...' : 'Cancel Plan'}
          </button>
        )}
      </div>
    );
  }
  
  if (status === 'payment_failed') {
    return (
      <div className="subscription-banner subscription-banner--error">
        <button className="subscription-banner__close" onClick={dismiss} aria-label="Dismiss">✕</button>
        <div className="subscription-banner__icon">❌</div>
        <div className="subscription-banner__content">
          <h4>Payment Failed</h4>
          <p>Your payment was rejected by the bank. You can try again at any time.</p>
          {transaction_ref && <span className="subscription-banner__ref">Ref: {transaction_ref}</span>}
        </div>
        {onUpgrade && <button className="btn btn-primary" onClick={onUpgrade}>Try Again</button>}
      </div>
    );
  }

  if (status === 'cancelled' || status === 'expired') {
    const isExpired = status === 'expired';
    return (
      <div className="subscription-banner subscription-banner--inactive">
        <button className="subscription-banner__close" onClick={dismiss} aria-label="Dismiss">✕</button>
        <div className="subscription-banner__icon">!</div>
        <div className="subscription-banner__content">
          <h4>{isExpired ? 'Subscription Expired' : 'Subscription Cancelled'}</h4>
          <p>
            {isExpired 
              ? 'Your premium access has ended. Upgrade to restore your features.' 
              : 'Your subscription has been cancelled. Your premium features have been immediately revoked.'}
          </p>
        </div>
        {onUpgrade && <button className="btn btn-primary" onClick={onUpgrade}>Upgrade Now</button>}
      </div>
    );
  }

  return null;
};

export default SubscriptionStatusBanner;