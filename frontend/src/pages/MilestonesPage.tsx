import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { MilestonesResponse } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { Button } from '../components/common/Button';
import { formatShortDate } from '../utils/relativeTime';
import { urgencyLabel, urgencyStyle } from '../components/dashboard/urgency';
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const MilestonesPage: React.FC = () => {
  useDocumentTitle('Milestones');
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userService
      .getMilestones()
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load milestones.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!data) return <LoadingSpinner />;

  // Upcoming list comes mostly sorted by due_date, but we sort defensively so
  // a server-side drift on either side stays invisible to the user.
  const upcoming = [...data.upcoming].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Milestones</h1>
        <p className="text-gray-600 mt-1">
          What you've already cleared, and what's coming up.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Achieved
        </h2>
        {data.achieved.length === 0 ? (
          <div
            data-testid="milestones-achieved-empty"
            className="bg-white rounded-lg shadow p-6 text-center space-y-3"
          >
            <p className="text-gray-700">
              Complete your first assessment to earn your first milestone.
            </p>
            <Link to="/assessments" className="inline-block">
              <Button type="button">Start an assessment</Button>
            </Link>
          </div>
        ) : (
          <ol className="border-l-2 border-blue-200 pl-6 space-y-5">
            {data.achieved.map((m, idx) => (
              // Compose key with idx + date — codes like `framework_step_completed`
              // legitimately repeat once per step completion.
              <li key={`${m.code}-${m.date}-${idx}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-1 inline-block w-4 h-4 rounded-full bg-blue-500 ring-2 ring-white"
                />
                <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                <time className="text-xs text-gray-500" dateTime={m.date}>
                  {formatShortDate(m.date)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-600">No upcoming milestones.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <li
                key={m.code}
                className="bg-white rounded-lg shadow p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    Due {formatShortDate(m.due_date)}
                    {m.category ? ` · ${m.category}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${urgencyStyle[m.urgency]}`}
                >
                  {urgencyLabel[m.urgency]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppLayout>
  );
};
