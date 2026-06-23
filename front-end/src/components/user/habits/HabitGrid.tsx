import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';
import HabitCard from './HabitCard';

interface Props {
  habits: Habit[];
  isLoading: boolean;
  isProcessing: boolean;
  isLogProcessing: boolean;
  isArchivedView: boolean;
  onEdit: (habit: Habit) => void;
  onArchiveToggle: (habit: Habit) => void;
  onDelete: (habit: Habit) => void; // <--- CHANGED TYPE
  onAddClick: () => void;
  onLog: (habitId: number, payload: HabitLogPayload) => void;
  onUpdateLog: (logId: number, payload: Partial<HabitLogPayload>) => void;
  onDeleteLog: (logId: number) => void;
}

const HabitGrid: React.FC<Props> = ({ 
  habits, isLoading, isProcessing, isLogProcessing, isArchivedView,
  onEdit, onArchiveToggle, onDelete, onAddClick, onLog, onUpdateLog, onDeleteLog
}) => {
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><i className={isArchivedView ? 'fas fa-box-archive' : 'fas fa-plus-circle'}></i></div>
        <h3 className="empty-state__title">{isArchivedView ? 'No Archived Habits' : 'No Active Habits'}</h3>
        <p className="empty-state__text">{isArchivedView ? 'Habits you archive will appear here.' : 'Build your first routine to start tracking your progress.'}</p>
        {!isArchivedView && (
          <button className="btn-add-habit mt-4" onClick={onAddClick}><i className="fas fa-plus"></i> Create Habit</button>
        )}
      </div>
    );
  }

  return (
    <div className="habit-grid">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onDelete={onDelete}
          onLog={onLog}
          onUpdateLog={onUpdateLog}
          onDeleteLog={onDeleteLog}
          isArchivedView={isArchivedView}
          isProcessing={isProcessing}
          isLogProcessing={isLogProcessing}
        />
      ))}
    </div>
  );
};

export default HabitGrid;