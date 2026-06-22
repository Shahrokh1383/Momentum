import React from 'react';

interface Props { activeStreaks: number; bestStreak: number; }

const StreakStatsCard: React.FC<Props> = ({ activeStreaks, bestStreak }) => (
  <div className="glass-panel streak-stats-card">
    <div className="streak-stats-card__item">
      <div className="streak-stats-card__icon streak-stats-card__icon--active"><i className="fas fa-fire"></i></div>
      <div className="streak-stats-card__info">
        <span className="streak-stats-card__value">{activeStreaks}</span>
        <span className="streak-stats-card__label">Active Streaks</span>
      </div>
    </div>
    <div className="streak-stats-card__divider"></div>
    <div className="streak-stats-card__item">
      <div className="streak-stats-card__icon streak-stats-card__icon--best"><i className="fas fa-trophy"></i></div>
      <div className="streak-stats-card__info">
        <span className="streak-stats-card__value">{bestStreak}</span>
        <span className="streak-stats-card__label">Best Streak</span>
      </div>
    </div>
  </div>
);

export default StreakStatsCard;