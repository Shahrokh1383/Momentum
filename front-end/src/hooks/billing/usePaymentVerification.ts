import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';

interface UsePaymentVerificationProps {
  transactionId: number;
  onSuccess: () => void;
  onFailure: () => void;
  onTimeout: () => void;
  timeoutSeconds?: number;
}

export const usePaymentVerification = ({
  transactionId,
  onSuccess,
  onFailure,
  onTimeout,
  timeoutSeconds = 20,
}: UsePaymentVerificationProps) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isDone, setIsDone] = useState(false);

  const { data, isError } = useQuery({
    queryKey: ['verifyPayment', transactionId],
    queryFn: () => subscriptionService.verifyPayment(transactionId),
    refetchInterval: isDone ? false : 3000,
    retry: false,
  });

  useEffect(() => {
    if (isDone) return;

    if (timeLeft <= 0) {
      setIsDone(true);
      onTimeout();
      return;
    }
    
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeout, isDone]);

  useEffect(() => {
    if (isDone || !data) return;

    if (data.status === 'confirmed' || data.status === 'already_confirmed') {
      setIsDone(true);
      onSuccess();
    } else if (data.status === 'failed') {
      setIsDone(true);
      onFailure();
    }
  }, [data, isError, onSuccess, onFailure, isDone]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / timeoutSeconds) * circumference;

  return { timeLeft, radius, circumference, offset };
};