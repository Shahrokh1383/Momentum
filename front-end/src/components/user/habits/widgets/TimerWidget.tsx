import React, { useState, useEffect, useRef } from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onDelete: () => void;
  isProcessing: boolean;
}

const TimerWidget: React.FC<Props> = ({ habit, onLog, onDelete, isProcessing }) => {
  const [seconds, setSeconds] = useState(habit.today_log?.duration_seconds || 0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const isLoggedToday = !!habit.today_log;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSave = () => {
    if (seconds < 1) return;
    setIsRunning(false);
    onLog({ logged_date: today, duration_seconds: seconds, status: 'completed' });
  };

  const handleReset = () => {
    if (isLoggedToday) {
      onDelete();
    } else {
      setIsRunning(false);
      setSeconds(0);
    }
  };

  return (
    <div className="timer-widget">
      <div className="timer-widget__display">{formatTime(seconds)}</div>
      
      <div className="timer-widget__controls">
        {!isLoggedToday && (
          <button 
            className={`timer-widget__btn ${!isRunning ? 'timer-widget__btn--play' : 'timer-widget__btn--stop'}`}
            onClick={() => setIsRunning(!isRunning)}
            disabled={isProcessing}
          >
            <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
        )}
        
        {!isLoggedToday && isRunning && (
          <button 
            className="timer-widget__btn timer-widget__btn--play"
            onClick={handleSave}
            disabled={isProcessing || seconds < 1}
          >
            <i className="fas fa-floppy-disk"></i>
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
      
      {isLoggedToday && (
        <small className="text-muted-custom">Logged for today. Reset to clear.</small>
      )}
    </div>
  );
};

export default TimerWidget;