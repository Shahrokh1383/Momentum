import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHabits } from '../hooks/useHabits';

const HabitItem = ({ habit, onDelete }) => {
  const { deleteHabit } = useHabits();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
  };

  useEffect(() => {
    if (isDeleting) {
      deleteHabit(habit.id);
      onDelete(habit.id);
      const timer = setTimeout(() => setIsDeleting(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, habit.id, deleteHabit, onDelete]);

  if (isDeleting) {
    return (
      <div className="alert alert-warning text-center slide-up">
        Habit deleted!
      </div>
    );
  }

  return (
    <div className="card p-3 mb-3 list-item-hover">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="text-white">{habit.name}</h5>
          <p className="text-light mb-0">{habit.description}</p>
          <small className="text-muted">Frequency: {habit.frequency}</small>
        </div>
        <div>
          <button
            className="btn btn-sm btn-outline-info mx-1"
            onClick={() => navigate(`/log/${habit.id}`)}
          >
            Log
          </button>
          <button
            className="btn btn-sm btn-outline-warning mx-1"
            onClick={() => navigate(`/edit/${habit.id}`)}
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-outline-danger mx-1"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitItem;