import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { RecommendationsResponse } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { RecommendedActions } from '../components/dashboard/RecommendedActions';
import { WorksheetCard } from '../components/worksheets/WorksheetCard';

// Accept all status values the backend may emit. `completed` is the canonical
// value; `done` is tolerated as an alias for forward-compat.
const readingStatusStyle: Record<string, { tone: string; label: string }> = {
  next: { tone: 'bg-blue-50 text-blue-700 ring-blue-200', label: 'Next' },
  upcoming: { tone: 'bg-gray-50 text-gray-700 ring-gray-200', label: 'Upcoming' },
  completed: { tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Done' },
  done: { tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Done' },
};
const _fallbackStatusStyle = {
  tone: 'bg-gray-50 text-gray-700 ring-gray-200',
  label: '',
};

export const RecommendationsPage: React.FC = () => {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userService
      .getRecommendations()
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load recommendations.'));
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
  if (!data) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Your recommendations</h1>
        {data.current_stage && (
          <p className="text-gray-600 mt-1">
            Tailored to your current stage:{' '}
            <span className="font-medium">{data.current_stage}</span>
          </p>
        )}
      </header>

      <RecommendedActions
        actions={data.immediate_actions}
        title="Immediate actions"
      />

      {data.reading_path.length > 0 && (
        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Suggested reading path
          </h2>
          <ol className="space-y-3 list-decimal list-inside">
            {data.reading_path.map((entry) => {
              const style = readingStatusStyle[entry.status] ?? _fallbackStatusStyle;
              return (
                <li key={entry.order} className="text-gray-900">
                  <Link
                    to={`/framework/${encodeURIComponent(entry.step_number)}`}
                    className="hover:text-blue-700"
                  >
                    Step {entry.step_number} · {entry.title}
                  </Link>{' '}
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${style.tone}`}
                  >
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {data.suggested_examples.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Suggested examples
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suggested_examples.map((ex) => (
              <Link
                key={ex.example_code}
                to={`/examples/${encodeURIComponent(ex.example_code)}`}
                className="block bg-white rounded-lg shadow p-5 border border-transparent hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <p className="text-xs text-gray-500">{ex.example_code}</p>
                <h3 className="text-base font-semibold text-gray-900 mt-1">{ex.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{ex.reason}</p>
                <span className="block mt-3 text-sm font-medium text-blue-600">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.suggested_worksheets.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Suggested worksheets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suggested_worksheets.map((ws) => (
              <WorksheetCard
                key={ws.worksheet_code}
                worksheet={{ worksheet_code: ws.worksheet_code, title: ws.title }}
                reason={ws.reason}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
