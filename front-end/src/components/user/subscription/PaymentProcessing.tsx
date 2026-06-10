// src/components/user/subscription/PaymentProcessing.tsx

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';

interface PaymentProcessingProps {
  transactionId: number;
  onSuccess: () => void;
  onFailure: () => void;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ transactionId, onSuccess, onFailure }) => {
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timeout

  // Poll the verify endpoint every 3 seconds
  const { data, isError } = useQuery({
    queryKey: ['verifyPayment', transactionId],
    queryFn: () => subscriptionService.verifyPayment(transactionId),
    refetchInterval: 3000, 
    retry: false,
  });

  // Timeout logic
  useEffect(() => {
    if (timeLeft <= 0) {
      onFailure();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onFailure]);

  // React to gateway status changes
  useEffect(() => {
    if (data) {
      if (data.status === 'confirmed' || data.status === 'already_confirmed') {
        onSuccess();
      } else if (data.status === 'failed') {
        onFailure();
      }
    }
  }, [data, isError, onSuccess, onFailure]);

  // SVG Circle Math for Countdown Ring
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / 60) * circumference;

  return (
    <div className="payment-modal__processing">
      <div className="countdown-ring">
        <svg className="countdown-ring__svg" viewBox="0 0 120 120">
          <circle className="countdown-ring__bg" cx="60" cy="60" r={radius} />
          <circle 
            className="countdown-ring__progress" 
            cx="60" cy="60" r={radius}
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <div className="countdown-ring__text">{timeLeft}</div>
      </div>
      <p className="payment-modal__processing-text">Processing your payment securely...</p>
      <p className="payment-modal__processing-subtext">Please do not close this window.</p>
    </div>
  );
};

export default PaymentProcessing;