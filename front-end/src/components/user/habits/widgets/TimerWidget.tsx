import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const TimerWidget: React.FC<Props> = ({ habit, onLog, onDelete, isProcessing }) => {
  const targetSeconds = useMemo(() => Math.max(0, Math.floor(habit.target_value || 0)), [habit.target_value]);
  const hasValidTarget = targetSeconds > 0;

  const [seconds, setSeconds] = useState(habit.today_log?.duration_seconds || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const isLoggedToday = !!habit.today_log;
  const hasReachedTarget = hasValidTarget && seconds >= targetSeconds;

  // Sync completion state from an existing log (e.g. page reload)
  useEffect(() => {
    if (isLoggedToday && hasValidTarget && habit.today_log!.duration_seconds! >= targetSeconds) {
      setIsCompleted(true);
    }
  }, [isLoggedToday, habit.today_log?.duration_seconds, targetSeconds, hasValidTarget]);

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
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatTargetLabel = (totalSecs: number): string => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
  };

  const handleSave = () => {
    if (!hasReachedTarget) return;
    setIsRunning(false);
    onLog({ logged_date: today, duration_seconds: seconds, status: 'completed' });
  };

  const handleReset = () => {
    if (isLoggedToday) {
      onDelete();
    } else {
      setIsRunning(false);
      setSeconds(0);
      setIsCompleted(false);
    }
  };

  const progressPercent = hasValidTarget ? Math.min((seconds / targetSeconds) * 100, 100) : 0;

  return (
    <div className={`timer-widget ${isCompleted ? 'timer-widget--completed' : ''}`}>
      {hasValidTarget && (
        <div className="timer-widget__target">Target: {formatTargetLabel(targetSeconds)}</div>
      )}

      <div className="timer-widget__display">
        {formatTime(seconds)}
        {isCompleted && (
          <span className="timer-widget__check">
            <i className="fas fa-check-circle"></i>
          </span>
        )}
      </div>

      {hasValidTarget && (
        <div className="timer-widget__progress">
          <div
            className={`timer-widget__progress-bar ${isCompleted ? 'timer-widget__progress-bar--full' : ''}`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      )}

      <div className="timer-widget__controls">
        {!isLoggedToday && !isCompleted && (
          <button
            className={`timer-widget__btn ${!isRunning ? 'timer-widget__btn--play' : 'timer-widget__btn--stop'}`}
            onClick={() => setIsRunning(!isRunning)}
            disabled={isProcessing}
          >
            <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
        )}

        {!isLoggedToday && isCompleted && (
          <button
            className="timer-widget__btn timer-widget__btn--save"
            onClick={handleSave}
            disabled={isProcessing}
            title="Save completed timer"
          >
            <i className="fas fa-check"></i>
          </button>
        )}

        <button
          className="timer-widget__btn"
          onClick={handleReset}
          disabled={isProcessing || (seconds === 0 && !isLoggedToday)}
        >
          <i className={`fas ${isLoggedToday ? 'fa-trash' : 'fa-rotate-left'}`}></i>
        </button>
      </div>

      {isCompleted && !isLoggedToday && (
        <div className="timer-widget__completed-text">
          <i className="fas fa-trophy"></i> Target reached! Save to confirm.
        </div>
      )}

      {isLoggedToday && (
        <small className="text-muted-custom">Logged for today. Reset to clear.</small>
      )}
    </div>
  );
};

export default TimerWidget;