import React from 'react';

interface Props { label: string; used: number; limit: number; unlimited?: boolean; icon: string; }

const QuotaIndicator: React.FC<Props> = ({ label, used, limit, unlimited, icon }) => {
  const percentage = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !unlimited && percentage >= 80;
  const isDanger = !unlimited && percentage >= 100;

  let barClass = 'quota-indicator__bar';
  if (isDanger) barClass += ' quota-indicator__bar--danger';
  else if (isWarning) barClass += ' quota-indicator__bar--warning';

  return (
    <div className="quota-indicator">
      <div className="quota-indicator__header">
        <span className="quota-indicator__label"><i className={`fas ${icon} me-2`}></i>{label}</span>
        <span className="quota-indicator__values">
          {unlimited ? <span className="quota-indicator__unlimited">{used} / Unlimited</span> : <span>{used} / {limit}</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="quota-indicator__track">
          <div className={barClass} style={{ width: `${percentage}%` }}></div>
        </div>
      )}
    </div>
  );
};

export default QuotaIndicator;