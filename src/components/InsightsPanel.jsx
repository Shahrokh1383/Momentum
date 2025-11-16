import React from 'react';
import { useHabits } from '../hooks/useHabits';
import { calculateStreak, calculateAdherenceRate, calculatePeakActivityDate } from '../utils/analytics';

const InsightsPanel = () => {
  const { habits } = useHabits();

  const allLogs = habits.flatMap(habit => habit.logs || []);

  const totalStreak = Math.max(...habits.map(h => calculateStreak(h.logs || [])), 0);
  const totalAdherence = calculateAdherenceRate(allLogs);
  const peakActivity = calculatePeakActivityDate(allLogs);

  return (
    <div className="card p-4 shadow-lg mb-4 bg-dark text-light">
      <h3 className="text-center mb-4">Insights</h3>
      <div className="row text-center">
        <div className="col-md-4 mb-3">
          <div className="card bg-gradient-success text-white p-3 h-100">
            <h5 className="text-uppercase">Longest Streak</h5>
            <p className="display-4">{totalStreak} days</p>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card bg-gradient-info text-white p-3 h-100">
            <h5 className="text-uppercase">Adherence Rate</h5>
            <p className="display-4">{totalAdherence}%</p>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card bg-gradient-warning text-white p-3 h-100">
            <h5 className="text-uppercase">Peak Activity Date</h5>
            <p className="display-4">{peakActivity}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;