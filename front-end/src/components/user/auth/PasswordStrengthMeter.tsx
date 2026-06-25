import React, { useMemo } from 'react';
import { evaluatePasswordStrength } from '@/utils/auth/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  return (
    <>
      <div className="password-strength">
        <div 
          className="password-strength-bar" 
          style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }}
        ></div>
      </div>
      <div className="strength-text mb-3" style={{ color: strength.color }}>
        {strength.label}
      </div>
    </>
  );
};

export default PasswordStrengthMeter;