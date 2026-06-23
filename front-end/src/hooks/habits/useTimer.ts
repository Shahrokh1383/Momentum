import { useState, useEffect, useRef, useMemo } from 'react';
import { Habit } from '@/types/habit';

/**
 * Convert a target value + unit into total seconds.
 */
const toSeconds = (value: number | null, unit: string | null): number => {
  const v = value || 0;
  switch (unit) {
    case 'hours': return v * 3600;
    case 'minutes': return v * 60;
    default: return v;
  }
};

export const useTimer = (habit: Habit) => {
  const targetSeconds = useMemo(
    () => Math.max(0, toSeconds(habit.target_value, habit.unit)),
    [habit.target_value, habit.unit]
  );
  const hasValidTarget = targetSeconds > 0;

  const [seconds, setSeconds] = useState(habit.today_log?.duration_seconds || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoggedToday = !!habit.today_log;
  const hasReachedTarget = hasValidTarget && seconds >= targetSeconds;

  // Sync completion state from an existing log (e.g., page reload)
  useEffect(() => {
    if (isLoggedToday && hasValidTarget && habit.today_log!.duration_seconds! >= targetSeconds) {
      setIsCompleted(true);
    }
  }, [isLoggedToday, habit.today_log?.duration_seconds, targetSeconds, hasValidTarget]);

  // Timer interval logic
  useEffect(() => {
    if (isRunning && !hasReachedTarget) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1;
          if (hasValidTarget && next >= targetSeconds) {
            setIsRunning(false);
            setIsCompleted(true);
            return next;
          }
          return next;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, hasReachedTarget, targetSeconds, hasValidTarget]);

  const formatTime = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const formatTargetLabel = (): string => {
    const val = Math.floor(habit.target_value || 0);
    const unit = habit.unit || 'seconds';
    return `${val} ${unit}`;
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  
  const reset = () => {
    setIsRunning(false);
    setSeconds(0);
    setIsCompleted(false);
  };

  return {
    seconds,
    isRunning,
    isCompleted,
    hasValidTarget,
    targetSeconds,
    isLoggedToday,
    hasReachedTarget,
    formatTime,
    formatTargetLabel,
    start,
    pause,
    reset,
  };
};