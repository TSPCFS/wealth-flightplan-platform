import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { worksheetService } from '../services/worksheet.service';
import type {
  WorksheetCode,
  WorksheetHistoryResponse,
} from '../types/worksheet.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { formatCurrency, formatPercent } from '../utils/format';

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
  return value === null || value === undefined ? '—' : JSON.stringify(value);
};

const humaniseKey = (k: string): string =>
  k.replace(/_pct$/, ' %').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const WorksheetHistoryPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link to="/worksheets" className="text-blue-600 underline">
            Back to worksheets
          </Link>
        </div>
      </div>
    );
  }
  if (!data) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/worksheets" className="text-sm text-blue-600 underline">
            ← Worksheets
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {data.worksheet_code} history
          </h1>
        </div>
        <Link
          to={`/worksheets/${encodeURIComponent(data.worksheet_code)}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
        >
          Take it again
        </Link>
      </header>

      {data.submissions.length === 0 ? (
        <p className="text-center text-gray-600 py-8">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Completion</th>
                <th className="text-left px-4 py-2">Headline values</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.submissions.map((s) => (
                <tr key={s.worksheet_id}>
                  <td className="px-4 py-2 align-top text-gray-800">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-4 py-2 align-top text-right text-gray-800">
                    {s.completion_percentage}%
                  </td>
                  <td className="px-4 py-2 align-top">
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {Object.entries(s.calculated_values_summary).map(([k, v]) => (
                        <li key={k}>
                          <span className="text-gray-500">{humaniseKey(k)}:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {renderSummaryValue(k, v)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-2 align-top text-right">
                    <Link
                      to={`/worksheets/results/${encodeURIComponent(s.worksheet_id)}`}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
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
    </div>
  );
};
