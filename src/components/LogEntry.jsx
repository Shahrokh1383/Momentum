import React from 'react';
import { useHabits } from '../hooks/useHabits';

const LogEntry = ({ habit, date }) => {
  const { logHabit } = useHabits();

  const handleLog = (status) => {
    logHabit(habit.id, date, status);
  };

  const log = habit.logs && Array.isArray(habit.logs) ? habit.logs.find(log => log.date === date) : undefined;

  return (
    <div className="d-flex justify-content-center my-2">
      <button
        className={`btn btn-sm mx-1 ${log?.status === 'done' ? 'btn-success active' : 'btn-outline-success'}`}
        onClick={() => handleLog('done')}
      >
        Done
      </button>
      <button
        className={`btn btn-sm mx-1 ${log?.status === 'missed' ? 'btn-danger active' : 'btn-outline-danger'}`}
        onClick={() => handleLog('missed')}
      >
        Missed
      </button>
    </div>
  );
};

export default LogEntry;