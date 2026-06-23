import React, { useState, useEffect, useRef } from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onUpdate: (logId: number, payload: Partial<HabitLogPayload>) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const NumericLog: React.FC<Props> = ({ habit, onLog, onUpdate, onDelete, isProcessing }) => {
  const [localValue, setLocalValue] = useState(habit.today_log?.value?.toString() || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const targetValue = habit.target_value || 0;
  const hasValidTarget = targetValue > 0;
  const currentValue = parseFloat(localValue) || 0;
  const isCompleted = hasValidTarget && currentValue >= targetValue;

  useEffect(() => {
    setLocalValue(habit.today_log?.value?.toString() || '');
  }, [habit.today_log?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Clamp to target value to prevent exceeding backend limit
    if (hasValidTarget) {
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > targetValue) {
        val = targetValue.toString();
      }
    }

    setLocalValue(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const numVal = val === '' ? null : parseFloat(val);
      if (isProcessing) return;

      if (numVal === null || isNaN(numVal)) {
        if (habit.today_log) onDelete();
      } else if (habit.today_log) {
        onUpdate(habit.today_log.id, { value: numVal });
      } else {
        onLog({ logged_date: today, value: numVal, status: 'completed' });
      }
    }, 600);
  };

  const progress = hasValidTarget && localValue
    ? Math.min((currentValue / targetValue) * 100, 100)
    : 0;

  return (
    <div className={`numeric-log ${isCompleted ? 'numeric-log--completed' : ''}`}>
      <div className="numeric-log__input-group">
        <input
          type="number"
          className="numeric-log__input"
          value={localValue}
          onChange={handleChange}
          placeholder="0"
          min="0"
          max={hasValidTarget ? targetValue : undefined}
          step="any"
        />
        <span className="numeric-log__label">
          / {targetValue} {habit.unit}
        </span>
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
        <div className="numeric-log__completed-text">
          <i className="fas fa-check-circle"></i> Target reached!
        </div>
      )}
    </div>
  );
};

export default NumericLog;