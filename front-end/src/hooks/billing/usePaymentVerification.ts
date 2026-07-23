import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';

interface UsePaymentVerificationProps {
  transactionId: string;
  onSuccess: () => void;
  onFailure: () => void;
  onTimeout: () => void;
}

export const usePaymentVerification = ({
  transactionId,
  onSuccess,
  onFailure,
  onTimeout,
}: UsePaymentVerificationProps) => {
  const callbacksRef = useRef({ onSuccess, onFailure, onTimeout });
  callbacksRef.current = { onSuccess, onFailure, onTimeout };

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const isDoneRef = useRef(false);

  const query = useQuery({
    queryKey: ['verifyPayment', transactionId],
    queryFn: () => subscriptionService.verifyPayment(transactionId),
    refetchInterval: (query) => {
      if (isDoneRef.current) return false;
      const data = query.state.data;
      if (data && data.status !== 'pending') return false;
      return 3000;
    },
    retry: false,
  });

  const { data } = query;

  // React to status changes
  useEffect(() => {
    if (isDoneRef.current || !data) return;

    if (data.status === 'success') {
      isDoneRef.current = true;
      callbacksRef.current.onSuccess();
    } else if (data.status === 'failed') {
      isDoneRef.current = true;
      callbacksRef.current.onFailure();
    }
  }, [data]);

  // Countdown from absolute deadline
  useEffect(() => {
    if (isDoneRef.current || !data?.deadline) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      if (isDoneRef.current) return;
      const now = Date.now();
      const deadlineMs = new Date(data.deadline).getTime();
      const remaining = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        isDoneRef.current = true;
        callbacksRef.current.onTimeout();
      }
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [data?.deadline]);

  // Ring animation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const totalSeconds = data?.deadline && data?.payment?.created_at
    ? Math.max(1, (new Date(data.deadline).getTime() - new Date(data.payment.created_at).getTime()) / 1000)
    : 900; // fallback 15 minutes

  const offset = timeLeft != null
    ? circumference - (timeLeft / totalSeconds) * circumference
    : circumference;

  return { timeLeft, radius, circumference, offset };
};