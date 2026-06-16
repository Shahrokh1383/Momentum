import React, { useEffect } from 'react';

interface PaymentResultProps {
  status: 'success' | 'failed' | 'timeout';
  message?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const PaymentResult: React.FC<PaymentResultProps> = ({ status, message, onClose, onRetry }) => {
  // Auto-close on success after 3 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (status === 'success') {
    return (
      <div className="payment-modal__content payment-result-card">
        <div className="payment-modal__success">
          <svg className="payment-success__icon" viewBox="0 0 52 52">
            <circle className="payment-success__circle" cx="26" cy="26" r="25" fill="none" />
            <path className="payment-success__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
          <h2 className="payment-modal__title">Payment Successful!</h2>
          <p className="payment-modal__subtitle">
            Your subscription is now active. Enjoy your premium features!
          </p>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="payment-modal__content payment-result-card">
        <div className="payment-modal__timeout">
          <div className="payment-timeout__icon">
            <i className="fas fa-hourglass-half"></i>
          </div>
          <h2 className="payment-modal__title">Verification Delayed</h2>
          <p className="payment-modal__subtitle">
            {message || 'Verification is taking longer than expected. You can safely return to the plans page, and your subscription will activate automatically once the bank confirms it.'}
          </p>
          <div className="payment-modal__actions">
            <button className="btn btn-secondary" onClick={onClose}>Back to Plans</button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="payment-modal__content payment-result-card">
      <div className="payment-modal__failed">
        <div className="payment-failed__icon">
          <i className="fas fa-times-circle"></i>
        </div>
        <h2 className="payment-modal__title">Payment Failed</h2>
        <p className="payment-modal__subtitle">
          {message || 'We could not process your payment. Please check your card details and try again.'}
        </p>
        <div className="payment-modal__actions">
          {onRetry && (
            <button className="btn btn-primary" onClick={onRetry}>Try Again</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Back to Plans</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;