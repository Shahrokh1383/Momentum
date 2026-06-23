import React from 'react';
import HabitCard, { HabitActions, LogActions } from './HabitCard';
import { Habit } from '@/types/habit';

interface Props {
  habits: Habit[];
  isLoading: boolean;
  isProcessing: boolean;
  isLogProcessing: boolean;
  isArchivedView: boolean;
  habitActions: HabitActions;
  logActions: LogActions;
  onAddClick: () => void;
}

const HabitGrid: React.FC<Props> = ({ 
  habits, isLoading, isProcessing, isLogProcessing, isArchivedView,
  habitActions, logActions, onAddClick
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
          habitActions={habitActions}
          logActions={logActions}
          isArchivedView={isArchivedView}
          isProcessing={isProcessing}
          isLogProcessing={isLogProcessing}
        />
      ))}
    </div>
  );
};

export default HabitGrid;