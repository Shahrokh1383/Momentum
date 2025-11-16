import { useState, useEffect } from 'react';
import { getStoredHabits, saveHabits } from '../utils/storage';

export const useHabits = () => {
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    setHabits(getStoredHabits());
  }, []);

  const addHabit = (habit) => {
    const newHabit = { ...habit, id: Date.now(), logs: [] };
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveHabits(updated);
  };

  const updateHabit = (id, updatedHabit) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        return { ...updatedHabit, id, logs: h.logs };
      }
      return h;
    });
    setHabits(updated);
    saveHabits(updated);
  };

  const deleteHabit = (id) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    saveHabits(updated);
  };

  const logHabit = (habitId, date, status) => {
    const updated = habits.map(habit => {
      if (habit.id === habitId) {
        const newLog = { date, status };
        const logs = habit.logs || [];
        const existingIndex = logs.findIndex(log => log.date === date);
        
        let newLogs;
        if (existingIndex > -1) {
          newLogs = [...logs];
          newLogs[existingIndex] = newLog;
        } else {
          newLogs = [...logs, newLog];
        }
        
        return { ...habit, logs: newLogs };
      }
      return habit;
    });
    setHabits(updated);
    saveHabits(updated);
  };

  return { habits, addHabit, updateHabit, deleteHabit, logHabit };
};