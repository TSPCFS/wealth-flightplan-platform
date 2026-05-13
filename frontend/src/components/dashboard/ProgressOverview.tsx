import React from 'react';
import { Link } from 'react-router-dom';
import type { OverallProgressSummary } from '../../types/user.types';
import { SectionLabel } from '../common/SectionLabel';

interface Props {
  progress: OverallProgressSummary;
}

export const ProgressOverview: React.FC<Props> = ({ progress }) => {
  const total = Math.max(1, progress.steps_total);
  const completed = Math.min(progress.steps_completed, total);

  return (
    <Link
      to="/progress"
      className="block bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 hover:shadow-attooh-md hover:border-attooh-lime transition focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
    >
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <SectionLabel underline={false}>Framework progress</SectionLabel>
        <span className="text-[15px] text-attooh-charcoal font-medium">
          {completed} of {progress.steps_total} steps complete
        </span>
      </div>

      {/* Segmented bar: one cell per step, filled for completed ones */}
      <div className="flex gap-2" aria-label="Framework progress">
        {Array.from({ length: total }).map((_, idx) => (
          <div
            key={idx}
            data-testid="progress-segment"
            className={`h-2 flex-1 rounded ${idx < completed ? 'bg-attooh-lime' : 'bg-attooh-border'}`}
          />
        ))}
      </div>

      {progress.next_step && (
        <p className="text-[13px] text-attooh-muted mt-3.5">
          Next up:{' '}
          <span className="font-medium text-attooh-charcoal">
            Step {progress.next_step.step_number} · {progress.next_step.title}
          </span>
        </p>
      )}
    </Link>
  );
};
