import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/user/useAuth';
import { useSubscription } from '@/hooks/user/useSubscription';
import { Plan } from '@/types/subscription';
import PlanCard from '@/components/user/subscription/PlanCard';
import PaymentModal from '@/components/user/subscription/PaymentModal';
import SubscriptionStatusBanner from '@/components/user/subscription/SubscriptionStatusBanner';

const PlansPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { 
    plans, 
    isLoadingPlans, 
    currentSubscription, 
    isLoadingSubscription, 
    upgrade, 
    isUpgrading,
    cancel,
    isCancelling 
  } = useSubscription();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    if (plan.slug === 'free') return;

    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleConfirmUpgrade = async (plan: Plan) => {
    try {
      await upgrade({
        plan_slug: plan.slug,
        payment_method: 'simulated',
      });
    } catch (error) {
      console.error("Upgrade failed:", error);
      // In a real app, you'd show a toast notification here
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel? Access remains until expiration.')) {
      return;
    }
    try {
      await cancel();
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  const isCurrentPlan = (planSlug: string): boolean => {
    return currentSubscription?.plan_slug === planSlug && currentSubscription?.status === 'active';
  };

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
          subscription={currentSubscription} 
          isLoading={isLoadingSubscription}
          onCancel={handleCancel}
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
        isOpen={isModalOpen}
        plan={selectedPlan}
        onClose={handleCloseModal}
        onConfirm={handleConfirmUpgrade}
      />
    </div>
  );
};

export default PlansPage;