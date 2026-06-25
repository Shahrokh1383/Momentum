export interface PasswordStrengthResult {
  score: number;
  color: string;
  label: string;
}

export const evaluatePasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return { score: 0, color: '#ef4444', label: 'Enter a password' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: Omit<PasswordStrengthResult, 'score'>[] = [
    { color: '#ef4444', label: 'Very Weak' },
    { color: '#f97316', label: 'Weak' },
    { color: '#eab308', label: 'Fair' },
    { color: '#22c55e', label: 'Strong' },
    { color: '#38ef7d', label: 'Very Strong' },
  ];

  const level = levels[score - 1] || levels[0];
  return { score, ...level };
};