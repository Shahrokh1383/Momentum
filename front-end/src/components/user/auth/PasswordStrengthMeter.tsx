import { useEffect, useState } from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const [strength, setStrength] = useState({ score: 0, color: '#ef4444', label: 'Enter a password' });

  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { color: '#ef4444', label: 'Very Weak' },
      { color: '#f97316', label: 'Weak' },
      { color: '#eab308', label: 'Fair' },
      { color: '#22c55e', label: 'Strong' },
      { color: '#38ef7d', label: 'Very Strong' },
    ];

    if (password.length === 0) {
      setStrength({ score: 0, color: '#ef4444', label: 'Enter a password' });
    } else {
      const level = levels[score - 1] || levels[0];
      setStrength({ score, ...level });
    }
  }, [password]);

  return (
    <>
      <div className="password-strength">
        <div 
          className="password-strength-bar" 
          id="strength-bar"
          style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }}
        ></div>
      </div>
      <div className="strength-text mb-3" id="strength-text" style={{ color: strength.color }}>
        {strength.label}
      </div>
    </>
  );
};

export default PasswordStrengthMeter;