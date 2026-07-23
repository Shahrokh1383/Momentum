import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaymentProcessing from '@/components/user/billing/PaymentProcessing';
import PaymentResult from '@/components/user/billing/PaymentResult';
import { useQueryClient } from '@tanstack/react-query';

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const transactionId = searchParams.get('transaction_id');
  const status = searchParams.get('status');

  const [isFailed, setIsFailed] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const handleSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setTimeout(() => navigate('/dashboard'), 3000);
  };

  const handleFailure = () => {
    setIsFailed(true);
  };

  const handleTimeout = () => {
    setIsTimedOut(true);
  };

  const handleClose = () => {
    navigate('/plans');
  };

  if (status === 'failed' || isFailed) {
    return (
      <div className="payment-result-page">
        <PaymentResult
          status="failed"
          message="Payment failed. Please try again or use a different payment method."
          onClose={handleClose}
        />
      </div>
    );
  }

  if (isTimedOut) {
    return (
      <div className="payment-result-page">
        <PaymentResult status="timeout" onClose={handleClose} />
      </div>
    );
  }

  if (!transactionId) {
    return (
      <div className="payment-result-page">
        <PaymentResult status="failed" message="No transaction found." onClose={handleClose} />
      </div>
    );
  }

  return (
    <div className="payment-result-page">
      <PaymentProcessing
        transactionId={transactionId}
        onSuccess={handleSuccess}
        onFailure={handleFailure}
        onTimeout={handleTimeout}
      />
    </div>
  );
};

export default PaymentResultPage;