import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import HabitItem from './HabitItem';
import InsightsPanel from './InsightsPanel';
import WeeklyChart from './WeeklyChart';
import MonthlyChart from './MonthlyChart';

const HabitList = () => {
  const { habits } = useHabits();
  const navigate = useNavigate();
  const [deletedId, setDeletedId] = useState(null);

  const handleDelete = (id) => {
    setDeletedId(id);
  };

  return (
    <div>
      <InsightsPanel />
      <WeeklyChart/>
      <MonthlyChart/>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-white">Your Habits</h3>
        <button className="btn btn-success" onClick={() => navigate('/add')}>
          Add Habit
        </button>
      </div>

      {habits.filter(h => h.id !== deletedId).length === 0 ? (
        <div className="text-center text-light">
          <p>No habits yet. Start by adding one!</p>
        </div>
      ) : (
        habits
          .filter(h => h.id !== deletedId)
          .map((habit) => (
            <HabitItem key={habit.id} habit={habit} onDelete={handleDelete} />
          ))
      )}
    </div>
  );
};

export default HabitList;