import React from 'react';
import { Link } from 'react-router-dom';
import type { StageCelebration as StageCelebrationData } from '../../hooks/useDashboardStageCelebration';
import { Button } from '../common/Button';

interface Props {
  celebration: StageCelebrationData;
  description?: string;
  onDismiss: () => void;
}

// Upward stage moves get a celebratory modal; downward moves get a softer
// inline banner. Either way we surface the change and let the user act on it
// without blocking the rest of the dashboard.
export const StageCelebration: React.FC<Props> = ({ celebration, description, onDismiss }) => {
  if (celebration.direction === 'down') {
    return (
      <section
        role="alert"
        className="bg-amber-50 ring-1 ring-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Heads up: your latest assessment placed you back in {celebration.next}.
          </p>
          {description && (
            <p className="text-sm text-amber-900 mt-1">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/recommendations">
            <Button>Open recommendations</Button>
          </Link>
          <Button variant="secondary" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </section>
    );
  }

  // Upward move — modal-style overlay anchored centre.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reached ${celebration.next}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">
            You've reached {celebration.next}!
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Up from {celebration.previous}.
          </p>
          {description && (
            <p className="text-sm text-gray-700 mt-3">{description}</p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <Link to="/framework">
            <Button>What this means</Button>
          </Link>
          <Button variant="secondary" onClick={onDismiss}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
