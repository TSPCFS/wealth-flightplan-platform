import React from 'react';
import { Link } from 'react-router-dom';
import type {
  WorksheetCode,
  WorksheetSubmission,
} from '../../types/worksheet.types';

interface BaseSummary {
  worksheet_code: WorksheetCode;
  title: string;
  description?: string;
  estimated_time_minutes?: number;
}

interface Props {
  worksheet: BaseSummary;
  latest?: WorksheetSubmission | null;
  // Override the description with e.g. a recommendation reason.
  reason?: string;
}

const daysAgo = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const days = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const badgeFor = (latest: WorksheetSubmission | null | undefined) => {
  if (!latest) return null;
  if (latest.is_draft) {
    return { label: 'Draft saved', tone: 'bg-amber-100 text-amber-800' };
  }
  return {
    label: `Last submitted ${daysAgo(latest.created_at)}`,
    tone: 'bg-emerald-100 text-emerald-800',
  };
};

export const WorksheetCard: React.FC<Props> = ({ worksheet, latest, reason }) => {
  const badge = badgeFor(latest);
  const body = reason ?? worksheet.description ?? '';

  return (
    <Link
      to={`/worksheets/${encodeURIComponent(worksheet.worksheet_code)}`}
      className="block bg-white rounded-lg shadow border border-transparent p-5 hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="font-medium">{worksheet.worksheet_code}</span>
        {worksheet.estimated_time_minutes !== undefined && (
          <span>~{worksheet.estimated_time_minutes} min</span>
        )}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{worksheet.title}</h2>
      {body && <p className="text-sm text-gray-600 mb-3 line-clamp-3">{body}</p>}
      {badge && (
        <span
          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${badge.tone}`}
        >
          {badge.label}
        </span>
      )}
      <span className="block mt-3 text-sm font-medium text-blue-600">Open →</span>
    </Link>
  );
};
