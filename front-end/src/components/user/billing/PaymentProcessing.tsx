import React from 'react';
import { usePaymentVerification } from '@/hooks/billing/usePaymentVerification';

interface PaymentProcessingProps {
  transactionId: string;
  onSuccess: () => void;
  onFailure: () => void;
  onTimeout: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  transactionId,
  onSuccess,
  onFailure,
  onTimeout,
}) => {
  const { timeLeft, radius, circumference, offset } = usePaymentVerification({
    transactionId,
    onSuccess,
    onFailure,
    onTimeout,
  });

  return (
    <div className="payment-modal__content payment-result-card">
      <div className="payment-modal__processing">
        <div className="countdown-ring">
          <svg className="countdown-ring__svg" viewBox="0 0 120 120">
            <circle className="countdown-ring__bg" cx="60" cy="60" r={radius} />
            <circle
              className="countdown-ring__progress"
              cx="60"
              cy="60"
              r={radius}
              style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
            />
          </svg>
          <div className="countdown-ring__text">
            {timeLeft !== null ? formatTime(timeLeft) : '...'}
          </div>
        </div>
        <p className="payment-modal__processing-text">Processing your payment securely...</p>
        <p className="payment-modal__processing-subtext">Please do not close this window.</p>
      </div>
    </div>
  );
};

export default PaymentProcessing;