import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';
import HabitLogWidget from './widgets/HabitLogWidget';

interface Props {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onArchiveToggle: (habit: Habit) => void;
  onDelete: (id: number) => void;
  onLog: (habitId: number, payload: HabitLogPayload) => void;
  onUpdateLog: (logId: number, payload: Partial<HabitLogPayload>) => void;
  onDeleteLog: (logId: number) => void;
  isArchivedView: boolean;
  isProcessing: boolean;
  isLogProcessing: boolean;
}

const HabitCard: React.FC<Props> = ({ 
  habit, onEdit, onArchiveToggle, onDelete, onLog, onUpdateLog, onDeleteLog, 
  isArchivedView, isProcessing, isLogProcessing 
}) => {
  const borderColor = habit.category?.color || '#64748b';

  return (
    <div 
      className={`habit-card ${isArchivedView ? 'habit-card--archived' : ''}`} 
      style={{ borderLeftColor: borderColor }}
    >
      <div className="habit-card__actions">
        <button className="habit-card__action-btn habit-card__action-btn--edit" onClick={() => onEdit(habit)} disabled={isProcessing}><i className="fas fa-pen"></i></button>
        <button className={`habit-card__action-btn ${isArchivedView ? 'habit-card__action-btn--restore' : 'habit-card__action-btn--archive'}`} onClick={() => onArchiveToggle(habit)} disabled={isProcessing}><i className={`fas ${isArchivedView ? 'fa-rotate-left' : 'fa-archive'}`}></i></button>
        <button className="habit-card__action-btn habit-card__action-btn--delete" onClick={() => { if(window.confirm(`Permanently delete "${habit.title}"?`)) onDelete(habit.id); }} disabled={isProcessing}><i className="fas fa-trash"></i></button>
      </div>

      <div className="habit-card__header">
        <h3 className="habit-card__title">{habit.title}</h3>
        {habit.category && (
          <span className="habit-card__category-pill" style={{ background: `${habit.category.color}20`, color: habit.category.color, borderColor: `${habit.category.color}40` }}>
            <i className={`${habit.category.icon} me-1`}></i>{habit.category.name}
          </span>
        )}
      </div>

      {habit.description && <p className="habit-card__description">{habit.description}</p>}

      <div className="habit-card__meta">
        {!isArchivedView && habit.is_due_today && (
          <span className="habit-card__due-badge"><span className="habit-card__due-dot"></span>Due Today</span>
        )}
        
        {habit.streak && habit.streak.current_streak > 0 && (
          <span className="habit-card__streak-badge">
            <i className="fas fa-fire me-1"></i>{habit.streak.current_streak} Day Streak
          </span>
        )}
      </div>

      {/* LOGGING WIDGET INJECTION */}
      {!isArchivedView && habit.is_due_today && (
        <div className="habit-card__widget-container">
          <HabitLogWidget 
            habit={habit} 
            onLog={onLog} 
            onUpdate={onUpdateLog} 
            onDeleteLog={onDeleteLog}
            isProcessing={isLogProcessing}
          />
        </div>
      )}

      {habit.tags.length > 0 && (
        <div className="habit-card__tags">
          {habit.tags.map(tag => (
            <span key={tag.id} className="habit-card__tag" style={{ borderLeftColor: tag.color }}>{tag.name}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default HabitCard;