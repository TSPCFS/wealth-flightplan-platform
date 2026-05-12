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
      <p className="text-gray-600">
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
    <ol className="border-l-2 border-blue-200 pl-6 space-y-6">
      {sorted.map((entry, idx) => {
        const isLatest = idx === sorted.length - 1;
        return (
          <li key={`${entry.date}-${entry.stage}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[33px] top-1 inline-block w-4 h-4 rounded-full ring-2 ring-white ${
                isLatest ? 'bg-blue-600' : 'bg-blue-300'
              }`}
            />
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900">{entry.stage}</h3>
              <time className="text-xs text-gray-500" dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
            </div>
            <p className="text-sm text-gray-600">Score: {entry.score}</p>
          </li>
        );
      })}
    </ol>
  );
};
