import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { ProgressResponse, StepProgress } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { Button } from '../components/common/Button';
import { formatShortDate } from '../utils/relativeTime';

const recomputeOverall = (steps: StepProgress[]): {
  steps_completed: number;
  overall_completion_pct: number;
} => {
  const completed = steps.filter((s) => s.is_completed).length;
  const total = Math.max(1, steps.length);
  return {
    steps_completed: completed,
    overall_completion_pct: Math.round((completed / total) * 100),
  };
};

interface StepRowProps {
  step: StepProgress;
  pending: boolean;
  onToggle: () => void;
}

const StepRow: React.FC<StepRowProps> = ({ step, pending, onToggle }) => (
  <li className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <span className="inline-flex items-center justify-center text-sm font-semibold text-white bg-blue-600 rounded-full w-9 h-9 shrink-0">
      {step.step_number}
    </span>
    <div className="flex-1 min-w-0">
      <Link
        to={`/framework/${encodeURIComponent(step.step_number)}`}
        className="text-base font-semibold text-gray-900 hover:text-blue-700"
      >
        {step.title}
      </Link>
      <p className="text-xs text-gray-500 mt-1">
        {step.is_completed && step.completed_at
          ? `Completed on ${formatShortDate(step.completed_at)}`
          : 'Not started'}
      </p>
    </div>
    <Button
      type="button"
      variant={step.is_completed ? 'secondary' : 'primary'}
      onClick={onToggle}
      disabled={pending}
      aria-label={step.is_completed ? `Mark step ${step.step_number} not done` : `Mark step ${step.step_number} complete`}
    >
      {pending ? 'Saving…' : step.is_completed ? 'Mark not done' : 'Mark complete'}
    </Button>
  </li>
);

export const ProgressPage: React.FC = () => {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  // `loadError` blocks the initial render; `toggleError` is an inline notice
  // so a failed mark-complete doesn't take the page away from the user.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [pendingStep, setPendingStep] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userService
      .getProgress()
      .then((p) => !cancelled && setProgress(p))
      .catch((err) => !cancelled && setLoadError((err as Error).message || 'Could not load progress.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={loadError} />
      </div>
    );
  }
  if (!progress) return <LoadingSpinner />;

  const onToggle = async (step: StepProgress) => {
    setPendingStep(step.step_number);
    setToggleError(null);
    // Optimistic update: flip locally, recompute aggregates, then call the
    // server; revert on failure.
    const snapshot = progress;
    const optimisticSteps = progress.steps.map((s) =>
      s.step_number === step.step_number
        ? {
            ...s,
            is_completed: !s.is_completed,
            completed_at: !s.is_completed ? new Date().toISOString() : null,
          }
        : s
    );
    setProgress({ ...progress, steps: optimisticSteps, ...recomputeOverall(optimisticSteps) });

    try {
      const fresh = await userService.setStepComplete(step.step_number, !step.is_completed);
      setProgress(fresh);
    } catch {
      setProgress(snapshot);
      setToggleError('Could not update step. Please try again.');
    } finally {
      setPendingStep(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Your framework progress</h1>
        <p className="text-gray-600 mt-1">
          Mark each step complete as you work through it. Step 4b (Business owners) appears when
          your profile reflects that you own a business.
        </p>
      </header>

      <section className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-700">
            {progress.steps_completed} of {progress.steps_total} steps complete
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {progress.overall_completion_pct}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Overall framework completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.overall_completion_pct}
          className="w-full bg-gray-200 rounded-full h-2"
        >
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress.overall_completion_pct}%` }}
          />
        </div>
      </section>

      {toggleError && <FormError error={toggleError} />}

      <ul className="space-y-3">
        {progress.steps.map((step) => (
          <StepRow
            key={step.step_number}
            step={step}
            pending={pendingStep === step.step_number}
            onToggle={() => onToggle(step)}
          />
        ))}
      </ul>
    </div>
  );
};
