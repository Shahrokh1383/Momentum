import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';
import { useDebouncedNumericInput } from '@/hooks/habits/useDebouncedNumericInput';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onUpdate: (logId: number, payload: Partial<HabitLogPayload>) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const NumericLog: React.FC<Props> = ({ habit, onLog, onUpdate, onDelete, isProcessing }) => {
  const today = new Date().toISOString().split('T')[0];
  const { localValue, handleChange, hasValidTarget, targetValue, isCompleted, progress } = useDebouncedNumericInput(habit);

  const commitValue = (val: string) => {
    if (isProcessing) return;
    const numVal = val === '' ? null : parseFloat(val);

    if (numVal === null || isNaN(numVal)) {
      if (habit.today_log) onDelete();
    } else if (habit.today_log) {
      onUpdate(habit.today_log.id, { value: numVal });
    } else {
      onLog({ logged_date: today, value: numVal });
    }
  };

  return (
    <div className={`numeric-log ${isCompleted ? 'numeric-log--completed' : ''}`}>
      <div className="numeric-log__input-group">
        <input
          type="number"
          className="numeric-log__input"
          value={localValue}
          onChange={(e) => handleChange(e.target.value, commitValue)}
          placeholder="0"
          min="0"
          max={hasValidTarget ? targetValue : undefined}
          step="any"
        />
        <span className="numeric-log__label">/ {targetValue} {habit.unit}</span>
      </div>
      
      {hasValidTarget && (
        <div className="numeric-log__progress">
          <div
            className={`numeric-log__progress-bar ${isCompleted ? 'numeric-log__progress-bar--full' : ''}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      {isCompleted && (
        <div className="numeric-log__completed-text"><i className="fas fa-check-circle"></i> Target reached!</div>
      )}
    </div>
  );
};

export default NumericLog;