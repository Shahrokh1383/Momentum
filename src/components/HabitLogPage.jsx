import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';
import LogEntry from './LogEntry';

const HabitLogPage = () => {
  const { habits } = useHabits();
  const { id } = useParams();
  const navigate = useNavigate();

  const habit = habits.find(h => h.id === Number(id));

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  if (!habit) {
    return (
      <div className="text-center text-light">
        Habit not found!
      </div>
    );
  }

  return (
    <div className="card p-4 shadow-lg">
      <h3 className="text-white mb-4">Log for: {habit.name}</h3>
      <div className="mb-3">
        <label className="form-label text-light">Select Date</label>
        <input
          type="date"
          className="form-control"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>
      <LogEntry habit={habit} date={selectedDate} />
      <button className="btn btn-secondary mt-3" onClick={() => navigate('/habits')}>
        Back to Habits
      </button>
    </div>
  );
};

export default HabitLogPage;