import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/user.service';
import type { DashboardResponse } from '../types/user.types';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { StageHero } from '../components/dashboard/StageHero';
import { ProgressOverview } from '../components/dashboard/ProgressOverview';
import { RecommendedActions } from '../components/dashboard/RecommendedActions';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { UpcomingMilestones } from '../components/dashboard/UpcomingMilestones';
import { QuickStats } from '../components/dashboard/QuickStats';
import { StageCelebration } from '../components/dashboard/StageCelebration';
import { useDashboardStageCelebration } from '../hooks/useDashboardStageCelebration';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userService
      .getDashboard()
      .then((d) => !cancelled && setDashboard(d))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load dashboard.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const { celebration, dismiss } = useDashboardStageCelebration(
    dashboard?.current_stage ?? null
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-12 px-4">
          <FormError error={error} />
        </div>
      </div>
    );
  }
  if (!dashboard) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      {celebration && (
        <StageCelebration
          celebration={celebration}
          description={dashboard.current_stage_details?.description}
          onDismiss={dismiss}
        />
      )}

      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              Welcome{user?.first_name ? `, ${user.first_name}` : ''}
            </h1>
            <p className="text-gray-600">Your Wealth FlightPlan™ dashboard.</p>
          </div>
          <Button onClick={() => logout()} variant="secondary">
            Logout
          </Button>
        </header>

        <StageHero stageDetails={dashboard.current_stage_details} />

        <ProgressOverview progress={dashboard.overall_progress} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecommendedActions
            actions={dashboard.recommended_actions}
            capAt={5}
            showAllLink="/recommendations"
          />
          <div className="space-y-4">
            <RecentActivity events={dashboard.recent_activity} capAt={5} />
            <UpcomingMilestones milestones={dashboard.upcoming_milestones} capAt={5} />
          </div>
        </div>

        <QuickStats stats={dashboard.quick_stats} />
      </div>
    </div>
  );
};
