import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';
import BooleanLog from './BooleanLog';
import NumericLog from './NumericLog';
import TimerWidget from './TimerWidget';
import ChecklistLog from './ChecklistLog';

interface Props {
  habit: Habit;
  onLog: (habitId: number, payload: HabitLogPayload) => void;
  onUpdate: (logId: number, payload: Partial<HabitLogPayload>) => void;
  onDeleteLog: (logId: number) => void;
  isProcessing: boolean;
}

const HabitLogWidget: React.FC<Props> = ({ habit, onLog, onUpdate, onDeleteLog, isProcessing }) => {
  const handleLog = (payload: HabitLogPayload) => onLog(habit.id, payload);
  const handleUpdate = (logId: number, payload: Partial<HabitLogPayload>) => onUpdate(logId, payload);
  const handleDelete = () => {
    if (habit.today_log) onDeleteLog(habit.today_log.id);
  };

  switch (habit.type) {
    case 'boolean':
      return <BooleanLog habit={habit} onLog={handleLog} onDelete={handleDelete} isProcessing={isProcessing} />;
    case 'numeric':
      return <NumericLog habit={habit} onLog={handleLog} onUpdate={handleUpdate} onDelete={handleDelete} isProcessing={isProcessing} />;
    case 'timer':
      return <TimerWidget habit={habit} onLog={handleLog} onDelete={handleDelete} isProcessing={isProcessing} />;
    case 'checklist':
      return <ChecklistLog habit={habit} onLog={handleLog} onUpdate={handleUpdate} isProcessing={isProcessing} />;
    default:
      return null;
  }
};

export default HabitLogWidget;