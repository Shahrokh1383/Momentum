import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface Props { usage: Record<string, number>; limits: Record<string, number>; }
const DISMISS_KEY = 'dismissed_quota_banner';

const QuotaBanner: React.FC<Props> = ({ usage, limits }) => {
  const [isDismissed, setIsDismissed] = useState(localStorage.getItem(DISMISS_KEY) === 'true');

  const warning = useMemo(() => {
    if (isDismissed) return null;
    const habitLimit = limits.max_active_habits;
    const habitUsage = usage.habits || 0;
    if (habitLimit && habitLimit !== -1 && habitUsage >= habitLimit * 0.8) {
      return { message: `You've used ${habitUsage} out of ${habitLimit} active habits. Upgrade to unlock more!` };
    }
    const catLimit = limits.max_categories;
    const catUsage = usage.categories || 0;
    if (catLimit && catLimit !== -1 && catUsage >= catLimit * 0.8) {
      return { message: `You're nearing your category limit (${catUsage}/${catLimit}). Upgrade for unlimited categories.` };
    }
    return null;
  }, [usage, limits, isDismissed]);

  const handleDismiss = () => { setIsDismissed(true); localStorage.setItem(DISMISS_KEY, 'true'); };
  if (!warning) return null;

  return (
    <div className="quota-banner quota-banner--warning">
      <button className="quota-banner__close" onClick={handleDismiss} aria-label="Dismiss"><i className="fas fa-times"></i></button>
      <div className="quota-banner__icon"><i className="fas fa-exclamation-triangle"></i></div>
      <div className="quota-banner__content">
        <h4>Approaching Plan Limit</h4>
        <p>{warning.message}</p>
      </div>
      <Link to="/plans" className="btn btn-primary quota-banner__cta">Upgrade Plan</Link>
    </div>
  );
};

export default QuotaBanner;