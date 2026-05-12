import React from 'react';
import { Link } from 'react-router-dom';
import type { CurrentStageDetails } from '../../types/user.types';
import { Button } from '../common/Button';

interface Props {
  stageDetails: CurrentStageDetails | null;
}

export const StageHero: React.FC<Props> = ({ stageDetails }) => {
  if (!stageDetails) {
    return (
      <section
        data-testid="stage-hero-empty"
        className="bg-white rounded-lg shadow p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Welcome
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            Take your first assessment
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Place yourself on the WealthFlightPlan™ stages in two minutes.
          </p>
        </div>
        <Link to="/assessments">
          <Button>Start an assessment</Button>
        </Link>
      </section>
    );
  }

  const pct = Math.min(100, Math.max(0, stageDetails.progress_to_next_stage_pct ?? 0));

  return (
    <section className="bg-white rounded-lg shadow p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Your current stage
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-words">{stageDetails.name}</h1>
          <p className="text-gray-700 mt-2">{stageDetails.description}</p>
        </div>
        <span className="inline-flex items-center text-xs font-semibold bg-blue-50 text-blue-800 ring-1 ring-blue-100 px-2 py-1 rounded">
          Income runway: {stageDetails.income_runway}
        </span>
      </div>

      {stageDetails.next_stage && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress to {stageDetails.next_stage}</span>
            <span>{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progress to ${stageDetails.next_stage}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="w-full bg-gray-200 rounded-full h-2"
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
