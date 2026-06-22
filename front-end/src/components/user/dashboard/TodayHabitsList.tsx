import React from 'react';
import { Habit } from '@/types/habit';
import { Link } from 'react-router-dom';

interface Props { habits: Habit[]; }

const TodayHabitsList: React.FC<Props> = ({ habits }) => {
  if (habits.length === 0) {
    return (
      <div className="glass-panel today-habits-card today-habits-card--empty">
        <i className="fas fa-check-circle today-habits-card__empty-icon"></i>
        <h4>All caught up!</h4>
        <p>No habits due today, or you've completed them all.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel today-habits-card">
      <div className="today-habits-card__header">
        <h3>Today's Focus</h3>
        <Link to="/habits" className="today-habits-card__link">View All</Link>
      </div>
      <ul className="today-habits-card__list">
        {habits.slice(0, 5).map(habit => {
          const isCompleted = !!habit.today_log;
          return (
            <li key={habit.id} className={`today-habits-card__item ${isCompleted ? 'completed' : ''}`}>
              <div className="today-habits-card__status">
                {isCompleted ? <i className="fas fa-check-circle"></i> : <i className="far fa-circle"></i>}
              </div>
              <div className="today-habits-card__details">
                <span className="today-habits-card__title">{habit.title}</span>
                {habit.category && (
                  <span className="today-habits-card__category" style={{ color: habit.category.color }}>
                    <i className={`${habit.category.icon} me-1`}></i>{habit.category.name}
                  </span>
                )}
              </div>
              <span className="today-habits-card__type">{habit.type}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TodayHabitsList;