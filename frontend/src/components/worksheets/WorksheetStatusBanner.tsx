import React from 'react';
import type { WorksheetFeedback } from '../../types/worksheet.types';

// attooh!-branded status tints. on_track keeps the lime accent (a positive
// affordance), needs_attention uses the warm warn ramp, critical the
// danger ramp. The left-border + lime-pale ramp matches the calculator
// key-principle treatment so callouts read consistently across the app.
const statusStyle: Record<WorksheetFeedback['status'], string> = {
  on_track: 'bg-attooh-lime-pale border-attooh-lime text-attooh-charcoal',
  needs_attention: 'bg-[#FFF4DA] border-attooh-warn text-attooh-charcoal',
  critical: 'bg-[rgba(199,54,59,0.08)] border-attooh-danger text-attooh-charcoal',
};

const statusLabelTone: Record<WorksheetFeedback['status'], string> = {
  on_track: 'text-attooh-success',
  needs_attention: 'text-[#B07A12]',
  critical: 'text-attooh-danger',
};

const statusLabel: Record<WorksheetFeedback['status'], string> = {
  on_track: 'On track',
  needs_attention: 'Needs attention',
  critical: 'Critical',
};

interface Props {
  feedback: WorksheetFeedback;
}

export const WorksheetStatusBanner: React.FC<Props> = ({ feedback }) => (
  <section
    role="status"
    className={`rounded-r-xl p-5 border-l-4 ${statusStyle[feedback.status]}`}
  >
    <p
      className={`font-lato text-[10px] font-bold uppercase tracking-[0.16em] mb-1 ${statusLabelTone[feedback.status]}`}
    >
      {statusLabel[feedback.status]}
    </p>
    <p className="text-sm">{feedback.message}</p>
    {feedback.recommendations.length > 0 && (
      <ul className="list-disc list-inside mt-3 space-y-1 text-sm marker:text-attooh-lime-hover">
        {feedback.recommendations.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    )}
  </section>
);
