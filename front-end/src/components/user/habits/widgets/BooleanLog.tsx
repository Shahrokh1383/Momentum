import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const BooleanLog: React.FC<Props> = ({ habit, onLog, onDelete, isProcessing }) => {
  const isChecked = !!habit.today_log;
  const today = new Date().toISOString().split('T')[0];

  const handleToggle = () => {
    if (isProcessing) return;
    if (isChecked) {
      onDelete();
    } else {
      onLog({ logged_date: today, status: 'completed' });
    }
  };

  return (
    <div className="boolean-log" onClick={handleToggle}>
      <div className={`boolean-log__checkbox ${isChecked ? 'checked' : ''}`}>
        <i className="fas fa-check"></i>
      </div>
      <span className="boolean-log__label">
        {isChecked ? 'Completed Today' : 'Mark as Done'}
      </span>
    </div>
  );
};

export default BooleanLog;