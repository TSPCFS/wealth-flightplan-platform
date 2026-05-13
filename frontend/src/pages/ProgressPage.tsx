import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { ProgressResponse, StepProgress } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { Button } from '../components/common/Button';
import { formatShortDate } from '../utils/relativeTime';
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
  <li className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-attooh-lime text-attooh-charcoal font-montserrat font-bold text-base ring-[3px] ring-attooh-lime-pale shrink-0"
    >
      {step.step_number}
    </span>
    <div className="flex-1 min-w-0">
      <Link
        to={`/framework/${encodeURIComponent(step.step_number)}`}
        className="text-base font-bold text-attooh-charcoal hover:text-attooh-lime-hover"
      >
        {step.title}
      </Link>
      <p className="text-xs text-attooh-muted mt-1">
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
  useDocumentTitle('Framework progress');
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
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={loadError} />
      </AppLayout>
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
    <AppLayout maxWidth="narrow" className="space-y-6">
      <header>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Your framework progress
        </h1>
        <p className="text-attooh-muted mt-1.5">
          Mark each step complete as you work through it. Step 4b (Business owners) appears when
          your profile reflects that you own a business.
        </p>
      </header>

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-attooh-charcoal">
            {progress.steps_completed} of {progress.steps_total} steps complete
          </p>
          <p className="text-sm font-bold text-attooh-charcoal">
            {progress.overall_completion_pct}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Overall framework completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.overall_completion_pct}
          className="w-full bg-attooh-border rounded-full h-2 overflow-hidden"
        >
          <div
            className="bg-attooh-lime h-2 rounded-full transition-all"
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
    </AppLayout>
  );
};
