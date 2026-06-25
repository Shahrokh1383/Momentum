import React from 'react';
import { Plan, UpgradePayload } from '@/types/subscription';
import { useSubscription } from '@/hooks/billing/useSubscription';

interface PaymentModalProps {
  isOpen: boolean;
  plan: Plan | null;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, plan, onClose }) => {
  const { upgrade, isUpgrading } = useSubscription();

  if (!isOpen || !plan) return null;

  const price = plan.pricing.monthly;

  const handleProceedToPayment = async () => {
    try {
      const payload: UpgradePayload = { plan_slug: plan.slug };
      const result = await upgrade(payload);
      
      // Redirect to Hosted Payment Page (HPP)
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to initiate payment. Please try again.');
    }
  };

  return (
    <div className="payment-modal">
      <div className="payment-modal__overlay" onClick={!isUpgrading ? onClose : undefined}></div>
      <div className="payment-modal__content">
        <button className="payment-modal__close" onClick={!isUpgrading ? onClose : undefined}>
          <i className="fas fa-times"></i>
        </button>

        <h2 className="payment-modal__title">Order Summary</h2>
        <p className="payment-modal__subtitle">
          You are upgrading to the <strong>{plan.name}</strong> plan.
        </p>

        <div className="payment-modal__details">
          <div className="payment-modal__detail-row">
            <span>Plan</span>
            <span>{plan.name}</span>
          </div>
          <div className="payment-modal__detail-row">
            <span>Billing Cycle</span>
            <span>Monthly</span>
          </div>
          <div className="payment-modal__detail-row payment-modal__detail-row--total">
            <span>Total Due Today</span>
            <span>${price} USD</span>
          </div>
        </div>

        <div className="payment-modal__security">
          <i className="fas fa-shield-alt"></i>
          <span>256-bit SSL Secure Payment</span>
        </div>

        <div className="payment-modal__methods">
          <span className="payment-modal__methods-label">We Accept:</span>
          <div className="payment-modal__methods-icons">
            <i className="fab fa-cc-visa"></i>
            <i className="fab fa-cc-mastercard"></i>
            <i className="fab fa-cc-amex"></i>
            <i className="fab fa-paypal"></i>
            <i className="fab fa-apple-pay"></i>
          </div>
        </div>

        <div className="payment-modal__actions">
          <button 
            type="button" 
            className="btn btn-primary" 
            disabled={isUpgrading}
            onClick={handleProceedToPayment}
          >
            {isUpgrading ? (
              <span className="btn__spinner"></span>
            ) : (
              'Proceed to Secure Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;