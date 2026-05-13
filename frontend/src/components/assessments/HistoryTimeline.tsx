import React from 'react';
import type { StageProgressionEntry } from '../../types/assessment.types';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface HistoryTimelineProps {
  progression: StageProgressionEntry[];
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ progression }) => {
  if (progression.length === 0) {
    return (
      <p className="text-attooh-muted">
        Take a 5- or 10-question assessment to start building your progression timeline.
      </p>
    );
  }

  // Defensively sort oldest first; the contract says backend already does this,
  // but we own the visual order so any drift here is invisible to the user.
  const sorted = [...progression].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <ol className="border-l-2 border-attooh-lime pl-6 space-y-6">
      {sorted.map((entry, idx) => {
        const isLatest = idx === sorted.length - 1;
        return (
          <li key={`${entry.date}-${entry.stage}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[33px] top-1 inline-block w-4 h-4 rounded-full ring-[3px] ring-attooh-lime-pale ${
                isLatest ? 'bg-attooh-lime' : 'bg-attooh-lime-pale border-2 border-attooh-lime'
              }`}
            />
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-attooh-charcoal">{entry.stage}</h3>
              <time className="text-xs text-attooh-muted" dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
            </div>
            <p className="text-sm text-attooh-muted">Score: {entry.score}</p>
          </li>
        );
      })}
    </ol>
  );
};
