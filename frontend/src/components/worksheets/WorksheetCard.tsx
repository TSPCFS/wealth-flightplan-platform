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
    return {
      label: 'Draft saved',
      tone: 'bg-[#FFF4DA] text-[#9C7611]',
    };
  }
  return {
    label: `Last submitted ${daysAgo(latest.created_at)}`,
    tone: 'bg-attooh-lime-pale text-attooh-success',
  };
};

export const WorksheetCard: React.FC<Props> = ({ worksheet, latest, reason }) => {
  const badge = badgeFor(latest);
  const body = reason ?? worksheet.description ?? '';

  return (
    <Link
      to={`/worksheets/${encodeURIComponent(worksheet.worksheet_code)}`}
      className="group block bg-attooh-card rounded-xl border border-attooh-border p-6 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-lato text-[11px] font-bold uppercase tracking-[0.16em] text-attooh-lime-hover">
          {worksheet.worksheet_code}
        </span>
        {worksheet.estimated_time_minutes !== undefined && (
          <span className="font-lato text-[11px] uppercase tracking-[0.1em] text-attooh-muted">
            ~{worksheet.estimated_time_minutes} min
          </span>
        )}
      </div>
      <h2 className="text-lg font-bold text-attooh-charcoal mb-2">{worksheet.title}</h2>
      {body && <p className="text-sm text-attooh-muted mb-3 line-clamp-3">{body}</p>}
      {badge && (
        <span
          className={`inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ${badge.tone}`}
        >
          {badge.label}
        </span>
      )}
      <span className="block mt-4 font-lato font-bold text-[13px] uppercase tracking-[0.08em] text-attooh-lime-hover group-hover:translate-x-0.5 transition">
        Open →
      </span>
    </Link>
  );
};
