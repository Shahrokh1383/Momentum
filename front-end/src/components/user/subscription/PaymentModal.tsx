import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plan, UpgradePayload } from '@/types/subscription';
import { useSubscription } from '@/hooks/user/useSubscription';
import CardInputForm from './CardInputForm';
import PaymentProcessing from './PaymentProcessing';
import PaymentResult from './PaymentResult';

interface PaymentModalProps {
  isOpen: boolean;
  plan: Plan | null;
  onClose: () => void;
}

type ModalStep = 'idle' | 'processing' | 'success' | 'failed';

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, plan, onClose }) => {
  const [step, setStep] = useState<ModalStep>('idle');
  const [transactionId, setTransactionId] = useState<number | null>(null);
  
  // FIX: Changed from string | null to string | undefined
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  
  const { upgrade, isUpgrading } = useSubscription();
  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setStep('idle');
    setTransactionId(null);
    // FIX: Resetting to undefined instead of null
    setErrorMessage(undefined);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCardSubmit = async (cardNumber: string) => {
    if (!plan) return;
    setErrorMessage(undefined); // FIX: using undefined
    
    try {
      const payload: UpgradePayload = { plan_slug: plan.slug, card_number: cardNumber };
      const result = await upgrade(payload);
      
      // Transition to processing state with the gateway transaction ID
      setTransactionId(result.payment.gateway_transaction_id);
      setStep('processing');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to initiate payment. Please try again.';
      setErrorMessage(msg);
      setStep('failed');
    }
  };

  const handleVerifySuccess = useCallback(async () => {
    // Invalidate queries to refresh user data and subscription status globally
    await queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setStep('success');
  }, [queryClient]);

  const handleVerifyFailure = useCallback(() => {
    setErrorMessage('Payment verification failed or timed out.');
    setStep('failed');
  }, []);

  if (!isOpen || !plan) return null;

  const renderContent = () => {
    switch (step) {
      case 'processing':
        return transactionId ? (
          <PaymentProcessing transactionId={transactionId} onSuccess={handleVerifySuccess} onFailure={handleVerifyFailure} />
        ) : null;
      case 'success':
        return <PaymentResult status="success" onClose={handleClose} />;
      case 'failed':
        return <PaymentResult status="failed" message={errorMessage} onClose={handleClose} onRetry={resetState} />;
      default:
        return <CardInputForm plan={plan} isSubmitting={isUpgrading} onSubmit={handleCardSubmit} error={errorMessage} />;
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-modal__overlay" onClick={step === 'idle' ? handleClose : undefined}></div>
      <div className="payment-modal__content">
        {step === 'idle' && (
          <button className="payment-modal__close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentModal;