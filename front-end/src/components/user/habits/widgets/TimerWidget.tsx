import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';
import { useTimer } from '@/hooks/habits/useTimer';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const TimerWidget: React.FC<Props> = ({ habit, onLog, onDelete, isProcessing }) => {
  const today = new Date().toISOString().split('T')[0];
  const {
    seconds, isRunning, isCompleted, hasValidTarget, targetSeconds,
    isLoggedToday, hasReachedTarget, formatTime, formatTargetLabel,
    start, pause, reset
  } = useTimer(habit);

  const handleSave = () => {
    if (!hasReachedTarget) return;
    pause();
    onLog({ logged_date: today, duration_seconds: seconds, status: 'completed' });
  };

  const handleReset = () => {
    if (isLoggedToday) {
      onDelete();
    } else {
      reset();
    }
  };

  const progressPercent = hasValidTarget ? Math.min((seconds / targetSeconds) * 100, 100) : 0;

  return (
    <div className={`timer-widget ${isCompleted ? 'timer-widget--completed' : ''}`}>
      {hasValidTarget && <div className="timer-widget__target">Target: {formatTargetLabel()}</div>}

      <div className="timer-widget__display">
        {formatTime(seconds)}
        {isCompleted && <span className="timer-widget__check"><i className="fas fa-check-circle"></i></span>}
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
            onClick={() => isRunning ? pause() : start()}
            disabled={isProcessing}
          >
            <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
        )}

        {!isLoggedToday && isCompleted && (
          <button className="timer-widget__btn timer-widget__btn--save" onClick={handleSave} disabled={isProcessing} title="Save completed timer">
            <i className="fas fa-check"></i>
          </button>
        )}

        <button className="timer-widget__btn" onClick={handleReset} disabled={isProcessing || (seconds === 0 && !isLoggedToday)}>
          <i className={`fas ${isLoggedToday ? 'fa-trash' : 'fa-rotate-left'}`}></i>
        </button>
      </div>

      {isCompleted && !isLoggedToday && (
        <div className="timer-widget__completed-text"><i className="fas fa-trophy"></i> Target reached! Save to confirm.</div>
      )}

      {isLoggedToday && <small className="text-muted-custom">Logged for today. Reset to clear.</small>}
    </div>
  );
};

export default TimerWidget;