import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';

interface PaymentProcessingProps {
  transactionId: number;
  onSuccess: () => void;
  onFailure: () => void;
  onTimeout: () => void;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ 
  transactionId, 
  onSuccess, 
  onFailure,
  onTimeout 
}) => {
  const [timeLeft, setTimeLeft] = useState(20);
  const [isDone, setIsDone] = useState(false); // Prevents infinite loops and stops polling

  // Poll the verify endpoint every 3 seconds
  const { data, isError } = useQuery({
    queryKey: ['verifyPayment', transactionId],
    queryFn: () => subscriptionService.verifyPayment(transactionId),
    refetchInterval: isDone ? false : 3000, // Stop polling if done
    retry: false,
  });

  // Countdown timer logic
  useEffect(() => {
    if (isDone) return;

    if (timeLeft <= 0) {
      setIsDone(true);
      onTimeout(); // Trigger timeout action instead of failure
      return;
    }
    
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeout, isDone]);

  // Gateway status polling logic
  useEffect(() => {
    if (isDone || !data) return;

    if (data.status === 'confirmed' || data.status === 'already_confirmed') {
      setIsDone(true);
      onSuccess();
    } else if (data.status === 'failed') {
      setIsDone(true);
      onFailure();
    }
    
    // Note: If isError is true (e.g., network error), we intentionally do nothing 
    // and let the timer continue, respecting the "bank might just be slow" requirement.
  }, [data, isError, onSuccess, onFailure, isDone]);

  // SVG Circle Math for Countdown Ring
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / 20) * circumference;

  return (
    <div className="payment-modal__content payment-result-card">
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
    </div>
  );
};

export default PaymentProcessing;