import React from 'react';
import { Link } from 'react-router-dom';
import type { OverallProgressSummary } from '../../types/user.types';

interface Props {
  progress: OverallProgressSummary;
}

export const ProgressOverview: React.FC<Props> = ({ progress }) => {
  const total = Math.max(1, progress.steps_total);
  const completed = Math.min(progress.steps_completed, total);

  return (
    <Link
      to="/progress"
      className="block bg-white rounded-lg shadow p-5 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Framework progress
        </h2>
        <span className="text-sm text-gray-700">
          {completed} of {progress.steps_total} steps complete
        </span>
      </div>

      {/* Segmented bar: one cell per step, filled for completed ones */}
      <div className="flex gap-1" aria-label="Framework progress">
        {Array.from({ length: total }).map((_, idx) => (
          <div
            key={idx}
            data-testid="progress-segment"
            className={`h-2 flex-1 rounded ${idx < completed ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {progress.next_step && (
        <p className="text-xs text-gray-500 mt-3">
          Next up:{' '}
          <span className="font-medium text-gray-800">
            Step {progress.next_step.step_number} · {progress.next_step.title}
          </span>
        </p>
      )}
    </Link>
  );
};
