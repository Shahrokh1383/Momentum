import React from 'react';
import { Streak } from '@/types/habit';

interface Props { streak: Streak | null | undefined; }

const StreakBadge: React.FC<Props> = ({ streak }) => {
  if (!streak || streak.current_streak === 0) return null;
  return (
    <span className="streak-badge" title={`${streak.longest_streak} days longest streak`}>
      <i className="fas fa-fire"></i>
      <span>{streak.current_streak}</span>
    </span>
  );
};

export default StreakBadge;