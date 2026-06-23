import { useState, useEffect, useRef } from 'react';
import { Habit } from '@/types/habit';

export const useDebouncedNumericInput = (habit: Habit) => {
  const [localValue, setLocalValue] = useState(habit.today_log?.value?.toString() || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetValue = habit.target_value || 0;
  const hasValidTarget = targetValue > 0;
  const currentValue = parseFloat(localValue) || 0;
  const isCompleted = hasValidTarget && currentValue >= targetValue;

  // Sync local state when the actual log changes from the server
  useEffect(() => {
    setLocalValue(habit.today_log?.value?.toString() || '');
  }, [habit.today_log?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (val: string, onCommit: (finalVal: string) => void) => {
    let clampedVal = val;

    // Clamp to target value to prevent exceeding backend limit
    if (hasValidTarget) {
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > targetValue) {
        clampedVal = targetValue.toString();
      }
    }

    setLocalValue(clampedVal);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      onCommit(clampedVal);
    }, 600);
  };

  const progress = hasValidTarget && localValue
    ? Math.min((currentValue / targetValue) * 100, 100)
    : 0;

  return {
    localValue,
    handleChange,
    hasValidTarget,
    targetValue,
    isCompleted,
    progress,
  };
};