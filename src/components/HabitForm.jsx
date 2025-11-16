import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';

const HabitForm = () => {
  const { habits, addHabit, updateHabit } = useHabits();
  const { id } = useParams();
  const navigate = useNavigate();

  const habit = habits.find(h => h.id === Number(id));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description);
      setFrequency(habit.frequency);
    }
  }, [habit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const habitData = { name, description, frequency };

    if (id) {
      updateHabit(Number(id), habitData);
      setMessage('Habit updated successfully!');
    } else {
      addHabit(habitData);
      setMessage('Habit added successfully!');
    }

    setTimeout(() => {
      setMessage('');
      navigate('/habits');
    }, 1500);
  };

  return (
    <div className="card p-4 shadow-lg fade-in">
      <h3 className="text-white mb-4">{id ? 'Edit Habit' : 'Add New Habit'}</h3>

      {message && <div className="alert alert-success slide-up">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label text-light">Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label text-light">Description</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label text-light">Frequency</label>
          <select
            className="form-control"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="d-flex justify-content-between">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/habits')}>
            Back
          </button>
          <button type="submit" className="btn btn-success btn-pulse">
            {id ? 'Update Habit' : 'Add Habit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HabitForm;