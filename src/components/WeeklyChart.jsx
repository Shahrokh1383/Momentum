import React from 'react';
import { useHabits } from '../hooks/useHabits';

const WeeklyChart = () => {
  const { habits } = useHabits();

  // تاریخ‌های 7 روز گذشته
  const today = new Date();
  const weekDates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    weekDates.push(date.toISOString().split('T')[0]);
  }

  // محاسبه تعداد "done" و "missed" برای هر روز
  const logCounts = weekDates.map(date => {
    const logs = habits.flatMap(h => h.logs || []).filter(log => log.date === date);
    const done = logs.filter(log => log.status === 'done').length;
    const missed = logs.filter(log => log.status === 'missed').length;
    return { date, done, missed };
  });

  // پیدا کردن بیشترین تعداد ثبت برای scale کردن progress bar
  const maxCount = Math.max(...logCounts.map(d => d.done + d.missed), 1);

  return (
    <div className="card p-4 shadow-lg mb-4">
      <h4 className="text-white mb-3">Weekly Progress</h4>
      <div className="row">
        {logCounts.map((day, index) => {
          const total = day.done + day.missed;
          const donePercent = maxCount > 0 ? Math.round((day.done / maxCount) * 100) : 0;
          const missedPercent = maxCount > 0 ? Math.round((day.missed / maxCount) * 100) : 0;

          return (
            <div key={day.date} className="col-1 text-center">
              <div className="text-muted small">{day.date.split('-')[2]}</div>
              <div className="progress mb-1" style={{ height: '60px' }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${donePercent}%` }}
                  aria-valuenow={day.done}
                  aria-valuemin="0"
                  aria-valuemax={maxCount}
                ></div>
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{ width: `${missedPercent}%` }}
                  aria-valuenow={day.missed}
                  aria-valuemin="0"
                  aria-valuemax={maxCount}
                ></div>
              </div>
              <div className="text-light small">{day.done}/{total}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyChart;