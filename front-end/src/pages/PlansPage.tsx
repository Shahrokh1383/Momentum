import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Plan } from '@/types/subscription';
import PlanCard from '@/components/user/billing/PlanCard';
import PaymentModal from '@/components/user/billing/PaymentModal';
import SubscriptionStatusBanner from '@/components/user/billing/SubscriptionStatusBanner';
import Modal from '@/components/ui/Modal';

const PlansPage: React.FC = () => {
  const { isAuthenticated, activePlan } = useAuth();
  const { 
    plans,
    plansError,
    isLoadingPlans,
    currentSubscription, 
    isLoadingSubscription, 
    isUpgrading,
    cancel,
    isCancelling 
  } = useSubscription();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    if (plan.slug === 'free') return;

    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const handleCancelRequest = () => {
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    try {
      await cancel();
      setIsCancelModalOpen(false);
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  const isCurrentPlan = (planSlug: string): boolean => {
    return currentSubscription?.plan_slug === planSlug && currentSubscription?.status === 'active';
  };

  if (plansError && !plans) {
    return (
      <div className="plans-page">
        <div className="plans-page__loading">
          <div className="card" style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <h1>📡 You are Offline</h1>
            <p>Could not load plans. Please check your connection and try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ background: '#11998e', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingPlans) {
    return (
      <div className="plans-page">
        <div className="plans-page__loading">
          <div className="spinner-border text-primary"></div>
          <p>Loading plans...</p>
        </div>
      </div>
    );
  }

  const currentTierName = activePlan === 'expert' ? 'Expert' : 'Premium';

  return (
    <div className="plans-page">
      <div className="plans-page__container">
        <div className="plans-page__header">
          <h1 className="plans-page__title">Choose Your Plan</h1>
          <p className="plans-page__subtitle">
            Unlock your full potential with premium features designed for serious habit builders.
          </p>
        </div>

        <SubscriptionStatusBanner 
          subscription={currentSubscription ?? null}
          isLoading={isLoadingSubscription}
          onCancel={handleCancelRequest}
          isCancelling={isCancelling}
        />

        <div className="plans-grid">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrentPlan(plan.slug)}
              isFeatured={plan.slug === 'premium'}
              isAuthenticated={isAuthenticated}
              onSelect={handleSelectPlan}
              disabled={isUpgrading}
            />
          ))}
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        plan={selectedPlan}
        onClose={handleClosePaymentModal}
      />

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
        footer={
          <>
            <button 
              className="modal-btn modal-btn--secondary" 
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Plan
            </button>
            <button 
              className="modal-btn modal-btn--danger" 
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem' }}>
          Are you sure you want to cancel your subscription?
        </p>
        <p style={{ color: '#dc3545', fontWeight: 600 }}>
          Cancelling will immediately revoke your {currentTierName} features and downgrade you to the Free plan. Any remaining time will be forfeited.
        </p>
      </Modal>
    </div>
  );
};

export default PlansPage;