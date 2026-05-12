import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { userService } from '../services/user.service';
import type { ProfileResponse } from '../types/api.types';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  // We pull the profile freshly on each dashboard mount so that current_stage
  // reflects the latest submission (the AuthContext snapshot can lag).
  useEffect(() => {
    let cancelled = false;
    userService
      .getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        // Silent — the header still works from the AuthContext user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stage = profile?.current_stage ?? null;
  const hasAssessment = Boolean(profile?.latest_assessment_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Welcome{user?.first_name ? `, ${user.first_name}` : ''}
            </h1>
            <p className="text-gray-600">Your Wealth FlightPlan™ dashboard.</p>
          </div>
          <Button onClick={() => logout()} variant="secondary">
            Logout
          </Button>
        </header>

        <section className="bg-white shadow rounded-lg p-6">
          {stage ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Your current stage
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{stage}</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/assessments">
                  <Button>Take another assessment</Button>
                </Link>
                {hasAssessment && (
                  <Link to="/assessments/history">
                    <Button variant="secondary">View history</Button>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Take your first assessment
              </h2>
              <p className="text-gray-600 mb-4">
                Place yourself on the WealthFlightPlan™ stages in two minutes.
              </p>
              <Link to="/assessments">
                <Button>Start an assessment</Button>
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
