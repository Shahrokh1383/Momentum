export const calculateStreak = (logs) => {
  if (!logs || logs.length === 0) return 0;

  const sortedLogs = [...logs]
    .filter(log => log.status === 'done')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortedLogs.length === 0) return 0;

  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate = null;

  for (const log of sortedLogs) {
    const logDate = new Date(log.date);
    if (prevDate) {
      const diffTime = logDate - prevDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    prevDate = logDate;
  }

  maxStreak = Math.max(maxStreak, currentStreak);
  return maxStreak;
};

export const calculateAdherenceRate = (logs) => {
  if (!logs || logs.length === 0) return 0;
  const doneLogs = logs.filter(log => log.status === 'done');
  return Math.round((doneLogs.length / logs.length) * 100);
};

export const calculatePeakActivityDate = (logs) => {
  if (!logs || logs.length === 0) return "No activity yet";

  const dateCount = {};
  logs.forEach(log => {
    if (!dateCount[log.date]) {
      dateCount[log.date] = 0;
    }
    dateCount[log.date]++;
  });

  const maxDate = Object.keys(dateCount).reduce((a, b) => dateCount[a] > dateCount[b] ? a : b);
  return maxDate;
};