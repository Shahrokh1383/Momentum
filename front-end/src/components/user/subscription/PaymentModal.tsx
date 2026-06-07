import React, { useEffect, useState } from 'react';
import { Plan } from '@/types/subscription';

interface PaymentModalProps {
  isOpen: boolean;
  plan: Plan | null;
  onClose: () => void;
  onConfirm: (plan: Plan) => void;
}

type ModalState = 'idle' | 'processing' | 'success';

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, plan, onClose, onConfirm }) => {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    if (modalState === 'processing') {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setModalState('success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [modalState]);

  useEffect(() => {
    if (modalState === 'success') {
      const timer = setTimeout(() => {
        onClose();
        setModalState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [modalState, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setModalState('idle');
      setCountdown(3);
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const handleConfirm = () => {
    setModalState('processing');
    onConfirm(plan);
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (countdown / 3) * circumference;

  return (
    <div className="payment-modal">
      <div className="payment-modal__overlay" onClick={modalState === 'idle' ? onClose : undefined}></div>
      <div className="payment-modal__content">
        {modalState === 'idle' && (
          <>
            <h3 className="payment-modal__title">Confirm Upgrade</h3>
            <p className="payment-modal__subtitle">
              You are upgrading to <strong>{plan.name}</strong>
            </p>
            <div className="payment-modal__details">
              <div className="payment-modal__detail-row">
                <span>Plan</span>
                <span>{plan.name}</span>
              </div>
              <div className="payment-modal__detail-row">
                <span>Amount</span>
                <span>
                  {plan.pricing.monthly ? `$${plan.pricing.monthly}/month` : 
                   plan.pricing.lifetime ? `$${plan.pricing.lifetime} one-time` : 'Free'}
                </span>
              </div>
            </div>
            <div className="payment-modal__actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-momentum" onClick={handleConfirm}>Confirm Payment</button>
            </div>
          </>
        )}

        {modalState === 'processing' && (
          <div className="payment-modal__processing">
            <div className="countdown-ring">
              <svg className="countdown-ring__svg" viewBox="0 0 100 100">
                <circle className="countdown-ring__bg" cx="50" cy="50" r="45" />
                <circle
                  className="countdown-ring__progress"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                  }}
                />
              </svg>
              <div className="countdown-ring__text">{countdown}</div>
            </div>
            <p className="payment-modal__processing-text">Processing your payment...</p>
          </div>
        )}

        {modalState === 'success' && (
          <div className="payment-modal__success">
            <div className="payment-success__icon">
              <svg viewBox="0 0 52 52">
                <circle className="payment-success__circle" cx="26" cy="26" r="25" fill="none" />
                <path className="payment-success__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 className="payment-modal__title">Payment Successful!</h3>
            <p className="payment-modal__subtitle">Your {plan.name} subscription is now active.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;