import React, { useState } from 'react';
import { Plan } from '@/types/subscription';

interface CardInputFormProps {
  plan: Plan;
  isSubmitting: boolean;
  onSubmit: (cardNumber: string) => void;
  error?: string | null;
}

const CardInputForm: React.FC<CardInputFormProps> = ({ plan, isSubmitting, onSubmit, error }) => {
  const [rawCardNumber, setRawCardNumber] = useState('');
  const [displayCardNumber, setDisplayCardNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all non-digits
    const digits = e.target.value.replace(/\D/g, '');
    
    // Limit to exactly 16 digits
    const limitedDigits = digits.slice(0, 16);
    setRawCardNumber(limitedDigits);
    
    // Format with spaces for display (e.g., 1234 5678 1234 5678)
    const formatted = limitedDigits.replace(/(.{4})/g, '$1 ').trim();
    setDisplayCardNumber(formatted);
    
    if (validationError) setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawCardNumber.length !== 16) {
      setValidationError('Card number must be exactly 16 digits.');
      return;
    }
    onSubmit(rawCardNumber);
  };

  const displayError = error || validationError;
  const price = plan.slug === 'lifetime' ? plan.pricing.lifetime : plan.pricing.monthly;
  const priceLabel = plan.slug === 'lifetime' ? 'Lifetime Access' : 'Monthly Subscription';

  return (
    <form onSubmit={handleSubmit} className="card-input-form">
      <h2 className="payment-modal__title">Upgrade to {plan.name}</h2>
      <p className="payment-modal__subtitle">
        Enter your card details to proceed with the <strong>{priceLabel}</strong>.
      </p>

      <div className="payment-modal__details">
        <div className="payment-modal__detail-row">
          <span>Plan</span>
          <span>{plan.name}</span>
        </div>
        <div className="payment-modal__detail-row">
          <span>Amount</span>
          <span>${price} USD</span>
        </div>
      </div>

      <div className="card-input-form__group">
        <label htmlFor="card-number" className="card-input-form__label">
          Card Number
        </label>
        <input
          id="card-number"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          className={`card-input-form__input ${displayError ? 'card-input-form__input--error' : ''}`}
          placeholder="1234 5678 1234 5678"
          value={displayCardNumber}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={19} // 16 digits + 3 spaces
        />
        {displayError && <p className="card-input-form__error">{displayError}</p>}
      </div>

      <div className="payment-modal__actions">
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isSubmitting || rawCardNumber.length !== 16}
        >
          {isSubmitting ? (
            <span className="btn__spinner"></span>
          ) : (
            `Pay $${price}`
          )}
        </button>
      </div>
    </form>
  );
};

export default CardInputForm;