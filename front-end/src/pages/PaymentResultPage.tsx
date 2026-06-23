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
  
  // State to track explicit failure vs timeout
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

  const handleTryAgain = () => {
    navigate('/plans');
  };

  const handleClose = () => {
    navigate('/plans');
  };

  // 1. Explicit failure from URL or polling
  if (status === 'failed' || isFailed) {
    return (
      <div className="payment-result-page">
        <PaymentResult 
          status="failed" 
          message="Payment was cancelled or failed." 
          onClose={handleClose}
          onRetry={handleTryAgain}
        />
      </div>
    );
  }

  // 2. Timeout reached
  if (isTimedOut) {
    return (
      <div className="payment-result-page">
        <PaymentResult 
          status="timeout" 
          onClose={handleClose}
        />
      </div>
    );
  }

  // 3. Missing transaction ID
  if (!transactionId) {
    return (
      <div className="payment-result-page">
        <PaymentResult 
          status="failed" 
          message="No transaction found." 
          onClose={handleClose}
        />
      </div>
    );
  }

  // 4. Default processing state
  return (
    <div className="payment-result-page">
      <PaymentProcessing 
        transactionId={parseInt(transactionId, 10)} 
        onSuccess={handleSuccess} 
        onFailure={handleFailure}
        onTimeout={handleTimeout}
      />
    </div>
  );
};

export default PaymentResultPage;