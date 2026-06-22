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

  useEffect(() => {
    setLocalValue(habit.today_log?.value?.toString() || '');
  }, [habit.today_log?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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

  const progress = habit.target_value && localValue 
    ? Math.min((parseFloat(localValue) / habit.target_value) * 100, 100) 
    : 0;

  return (
    <div className="numeric-log">
      <div className="numeric-log__input-group">
        <input 
          type="number" 
          className="numeric-log__input" 
          value={localValue} 
          onChange={handleChange}
          placeholder="0"
          min="0"
          step="any"
        />
        <span className="numeric-log__label">
          / {habit.target_value} {habit.unit}
        </span>
      </div>
      {habit.target_value && (
        <div className="numeric-log__progress">
          <div className="numeric-log__progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      )}
    </div>
  );
};

export default NumericLog;