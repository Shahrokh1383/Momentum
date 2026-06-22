import React from 'react';

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const CompletionRing: React.FC<Props> = ({ percentage, size = 160, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="completion-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="completion-ring__svg">
        <circle className="completion-ring__track" stroke="var(--glass-border)" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
        <circle className="completion-ring__progress" stroke="url(#ringGradient)" fill="transparent" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} r={radius} cx={size / 2} cy={size / 2} />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-light)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="completion-ring__text">
        <span className="completion-ring__percentage">{Math.round(percentage)}%</span>
        <span className="completion-ring__label">Completed</span>
      </div>
    </div>
  );
};

export default CompletionRing;