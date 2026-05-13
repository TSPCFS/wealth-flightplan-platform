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
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Milestones
        </h1>
        <p className="text-attooh-muted mt-1.5">
          What you've already cleared, and what's coming up.
        </p>
      </header>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
          Achieved
        </h2>
        {data.achieved.length === 0 ? (
          <div
            data-testid="milestones-achieved-empty"
            className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 text-center space-y-3"
          >
            <p className="text-attooh-charcoal">
              Complete your first assessment to earn your first milestone.
            </p>
            <Link to="/assessments" className="inline-block">
              <Button type="button">Start an assessment</Button>
            </Link>
          </div>
        ) : (
          <ol className="border-l-2 border-attooh-lime pl-6 space-y-5">
            {data.achieved.map((m, idx) => (
              // Compose key with idx + date; codes like `framework_step_completed`
              // legitimately repeat once per step completion.
              <li key={`${m.code}-${m.date}-${idx}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-1 inline-block w-4 h-4 rounded-full bg-attooh-lime ring-[3px] ring-attooh-lime-pale"
                />
                <p className="text-sm font-bold text-attooh-charcoal">{m.title}</p>
                <time className="text-xs text-attooh-muted" dateTime={m.date}>
                  {formatShortDate(m.date)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-attooh-muted">No upcoming milestones.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <li
                key={m.code}
                className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-attooh-charcoal">{m.title}</p>
                  <p className="text-xs text-attooh-muted">
                    Due {formatShortDate(m.due_date)}
                    {m.category ? ` · ${m.category}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ring-1 ${urgencyStyle[m.urgency]}`}
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
