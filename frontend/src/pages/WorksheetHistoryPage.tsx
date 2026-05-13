import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { worksheetService } from '../services/worksheet.service';
import type {
  WorksheetCode,
  WorksheetHistoryResponse,
} from '../types/worksheet.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { formatCurrency, formatPercent } from '../utils/format';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const VALID_CODES: WorksheetCode[] = ['APP-A', 'APP-B', 'APP-C', 'APP-D', 'APP-E', 'APP-F', 'APP-G'];

const isWorksheetCode = (v: string | undefined): v is WorksheetCode =>
  Boolean(v) && (VALID_CODES as string[]).includes(v as string);

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const renderSummaryValue = (key: string, value: unknown): string => {
  if (typeof value === 'number') {
    if (/(_pct|percent|pct)/i.test(key)) return formatPercent(value);
    if (/(total|amount|balance|debt|net_worth|surplus|deficit|asset|liability|income)/i.test(key)) {
      return formatCurrency(value);
    }
    return String(value);
  }
  if (typeof value === 'string') return value;
  return value === null || value === undefined ? '–' : JSON.stringify(value);
};

const humaniseKey = (k: string): string =>
  k.replace(/_pct$/, ' %').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const WorksheetHistoryPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  useDocumentTitle(code ? `${code} · history` : null);
  const [data, setData] = useState<WorksheetHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isWorksheetCode(code)) {
      setError('Unknown worksheet');
      return;
    }
    let cancelled = false;
    worksheetService
      .getHistory(code)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load history.'));
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link
            to="/worksheets"
            className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Back to worksheets
          </Link>
        </div>
      </AppLayout>
    );
  }
  if (!data) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="default" className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            to="/worksheets"
            className="inline-flex items-center font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Worksheets
          </Link>
          <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal mt-2 break-words tracking-tight">
            {data.worksheet_code} history
          </h1>
        </div>
        <Link
          to={`/worksheets/${encodeURIComponent(data.worksheet_code)}`}
          className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
        >
          Take it again →
        </Link>
      </header>

      {data.submissions.length === 0 ? (
        <p className="text-center text-attooh-muted py-8">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-attooh-bg font-lato text-xs uppercase tracking-wider text-attooh-slate">
              <tr>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Completion</th>
                <th className="text-left px-5 py-3">Headline values</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-attooh-border">
              {data.submissions.map((s) => (
                <tr key={s.worksheet_id}>
                  <td className="px-5 py-3 align-top text-attooh-charcoal">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-5 py-3 align-top text-right text-attooh-charcoal">
                    {s.completion_percentage}%
                  </td>
                  <td className="px-5 py-3 align-top">
                    <ul className="text-xs text-attooh-muted space-y-0.5">
                      {Object.entries(s.calculated_values_summary).map(([k, v]) => (
                        <li key={k}>
                          <span className="text-attooh-muted">{humaniseKey(k)}:</span>{' '}
                          <span className="font-medium text-attooh-charcoal">
                            {renderSummaryValue(k, v)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-3 align-top text-right">
                    <Link
                      to={`/worksheets/results/${encodeURIComponent(s.worksheet_id)}`}
                      className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};
