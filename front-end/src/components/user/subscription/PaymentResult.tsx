// src/components/user/subscription/PaymentResult.tsx

import React, { useEffect } from 'react';

interface PaymentResultProps {
  status: 'success' | 'failed';
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
    );
  }

  return (
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
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PaymentResult;