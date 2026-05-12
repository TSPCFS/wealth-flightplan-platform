import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { worksheetService } from '../services/worksheet.service';
import type {
  WorksheetCode,
  WorksheetSubmission,
  WorksheetsListResponse,
  WorksheetSummary,
} from '../types/worksheet.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';

const daysAgo = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const days = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

interface CatalogueRowProps {
  ws: WorksheetSummary;
  latest: WorksheetSubmission | null;
}

const CatalogueCard: React.FC<CatalogueRowProps> = ({ ws, latest }) => {
  const badge =
    latest === null
      ? null
      : latest.is_draft
        ? { label: 'Draft saved', tone: 'bg-amber-100 text-amber-800' }
        : {
            label: `Last submitted ${daysAgo(latest.created_at)}`,
            tone: 'bg-emerald-100 text-emerald-800',
          };

  return (
    <Link
      to={`/worksheets/${encodeURIComponent(ws.worksheet_code)}`}
      className="block bg-white rounded-lg shadow border border-transparent p-5 hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="font-medium">{ws.worksheet_code}</span>
        <span>~{ws.estimated_time_minutes} min</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{ws.title}</h2>
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{ws.description}</p>
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

export const WorksheetsCataloguePage: React.FC = () => {
  const [list, setList] = useState<WorksheetsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestByCode, setLatestByCode] = useState<
    Record<string, WorksheetSubmission | null>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalogue = await worksheetService.list();
        if (cancelled) return;
        setList(catalogue);

        // Fan out latest() per worksheet in parallel. Failures fall back to null
        // so the catalogue keeps rendering even if one lookup hiccups.
        const results = await Promise.all(
          catalogue.worksheets.map((ws) =>
            worksheetService
              .getLatest(ws.worksheet_code as WorksheetCode)
              .then((v) => [ws.worksheet_code, v] as const)
              .catch(() => [ws.worksheet_code, null] as const)
          )
        );
        if (cancelled) return;
        const map: Record<string, WorksheetSubmission | null> = {};
        for (const [code, v] of results) map[code] = v;
        setLatestByCode(map);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Could not load worksheets.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={error} />
      </div>
    );
  }
  if (!list) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Worksheets</h1>
        <p className="text-gray-600 mt-1">
          Fillable forms that turn the framework into a plan. Drafts autosave as you go.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.worksheets.map((ws) => (
          <CatalogueCard
            key={ws.worksheet_code}
            ws={ws}
            latest={latestByCode[ws.worksheet_code] ?? null}
          />
        ))}
      </div>
    </div>
  );
};
