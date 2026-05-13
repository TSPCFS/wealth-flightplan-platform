import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { RecommendationsResponse } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { RecommendedActions } from '../components/dashboard/RecommendedActions';
import { WorksheetCard } from '../components/worksheets/WorksheetCard';
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Accept all status values the backend may emit. `completed` is the canonical
// value; `done` is tolerated as an alias for forward-compat.
const readingStatusStyle: Record<string, { tone: string; label: string }> = {
  next: { tone: 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime', label: 'Next' },
  upcoming: { tone: 'bg-attooh-bg text-attooh-slate ring-attooh-border', label: 'Upcoming' },
  completed: { tone: 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime', label: 'Done' },
  done: { tone: 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime', label: 'Done' },
};
const _fallbackStatusStyle = {
  tone: 'bg-attooh-bg text-attooh-slate ring-attooh-border',
  label: '',
};

export const RecommendationsPage: React.FC = () => {
  useDocumentTitle('Recommendations');
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
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!data) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="default" className="space-y-8">
      <header>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Your recommendations
        </h1>
        {data.current_stage && (
          <p className="text-attooh-muted mt-1.5">
            Tailored to your current stage:{' '}
            <span className="font-medium text-attooh-charcoal">{data.current_stage}</span>
          </p>
        )}
      </header>

      <RecommendedActions
        actions={data.immediate_actions}
        title="Immediate actions"
      />

      {data.reading_path.length > 0 && (
        <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
          <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
            Suggested reading path
          </h2>
          <ol className="space-y-3 list-decimal list-inside marker:text-attooh-lime-hover marker:font-bold">
            {data.reading_path.map((entry) => {
              const style = readingStatusStyle[entry.status] ?? _fallbackStatusStyle;
              return (
                <li key={entry.order} className="text-attooh-charcoal">
                  <Link
                    to={`/framework/${encodeURIComponent(entry.step_number)}`}
                    className="hover:text-attooh-lime-hover"
                  >
                    Step {entry.step_number} · {entry.title}
                  </Link>{' '}
                  <span
                    className={`inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ring-1 ${style.tone}`}
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
          <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
            Suggested examples
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.suggested_examples.map((ex) => (
              <Link
                key={ex.example_code}
                to={`/examples/${encodeURIComponent(ex.example_code)}`}
                className="group block bg-attooh-card rounded-xl border border-attooh-border p-6 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
              >
                <p className="font-lato text-[11px] font-bold uppercase tracking-[0.16em] text-attooh-lime-hover">
                  {ex.example_code}
                </p>
                <h3 className="text-base font-bold text-attooh-charcoal mt-2">{ex.title}</h3>
                <p className="text-sm text-attooh-muted mt-2">{ex.reason}</p>
                <span className="block mt-4 font-lato font-bold text-[13px] uppercase tracking-[0.08em] text-attooh-lime-hover">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.suggested_worksheets.length > 0 && (
        <section>
          <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
            Suggested worksheets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
    </AppLayout>
  );
};
