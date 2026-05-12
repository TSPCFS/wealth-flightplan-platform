import React from 'react';
import type { WorksheetFeedback } from '../../types/worksheet.types';

const statusStyle: Record<WorksheetFeedback['status'], string> = {
  on_track: 'bg-emerald-50 ring-emerald-200 text-emerald-900',
  needs_attention: 'bg-amber-50 ring-amber-200 text-amber-900',
  critical: 'bg-red-50 ring-red-200 text-red-900',
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
    className={`rounded-lg p-5 ring-1 ${statusStyle[feedback.status]}`}
  >
    <p className="text-xs font-semibold uppercase tracking-wide mb-1">
      {statusLabel[feedback.status]}
    </p>
    <p className="text-sm">{feedback.message}</p>
    {feedback.recommendations.length > 0 && (
      <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
        {feedback.recommendations.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    )}
  </section>
);
