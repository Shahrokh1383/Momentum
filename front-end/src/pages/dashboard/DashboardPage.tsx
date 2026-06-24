import React from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import CompletionRing from '@/components/user/dashboard/CompletionRing';
import StreakStatsCard from '@/components/user/dashboard/StreakStatsCard';
import TodayHabitsList from '@/components/user/dashboard/TodayHabitsList';
import QuotaIndicator from '@/components/user/dashboard/QuotaIndicator';
import QuotaBanner from '@/components/user/dashboard/QuotaBanner';
import '@/styles/dashboard.css';

const DashboardPage: React.FC = () => {
  const { dashboardData, isLoadingDashboard } = useDashboard();
  const { quotas, isLoadingQuotas } = useSubscription();

  if (isLoadingDashboard || isLoadingQuotas) {
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  if (!dashboardData || !quotas) return null;
  const { habits, completion_percentage, streak_counts } = dashboardData;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__title">Dashboard</h1>
          <p className="text-muted-custom mb-0">Welcome back! Here is your progress overview.</p>
        </div>
      </div>

      <QuotaBanner usage={quotas.usage} limits={quotas.limits} />

      <div className="dashboard-page__grid">
        <div className="dashboard-page__col-main">
          <div className="glass-panel dashboard-progress-card">
            <div className="dashboard-progress-card__ring">
              <CompletionRing percentage={completion_percentage} />
            </div>
            <div className="dashboard-progress-card__info">
              <h3>Today's Momentum</h3>
              <p>You have completed {Math.round(completion_percentage)}% of your habits due today.</p>
            </div>
          </div>
          <StreakStatsCard activeStreaks={streak_counts.active_streaks} bestStreak={streak_counts.best_streak} />
          <TodayHabitsList habits={habits} />
        </div>

        <div className="dashboard-page__col-side">
          <div className="glass-panel dashboard-quotas-card">
            <h3 className="dashboard-quotas-card__title">Plan Limits</h3>
            <div className="dashboard-quotas-card__list">
              <QuotaIndicator label="Active Habits" used={quotas.usage.habits || 0} limit={quotas.limits.max_active_habits} icon="fa-list-check" />
              <QuotaIndicator label="Categories" used={quotas.usage.categories || 0} limit={quotas.limits.max_categories} icon="fa-folder" />
              <QuotaIndicator label="Weekly Freezes" used={quotas.freezes.used} limit={quotas.freezes.limit} unlimited={quotas.freezes.unlimited} icon="fa-snowflake" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;