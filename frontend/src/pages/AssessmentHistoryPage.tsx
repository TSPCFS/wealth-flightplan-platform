import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentService } from '../services/assessment.service';
import type { AssessmentHistoryResponse } from '../types/assessment.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { HistoryTimeline } from '../components/assessments/HistoryTimeline';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const typeLabel: Record<string, string> = {
  '5q': '5-Question',
  '10q': '10-Question',
  gap_test: 'GAP Test',
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const AssessmentHistoryPage: React.FC = () => {
  useDocumentTitle('Assessment history');
  const [data, setData] = useState<AssessmentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await assessmentService.getHistory();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Could not load history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error || !data) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error ?? 'No history available.'} />
      </AppLayout>
    );
  }

  const hasAny = data.assessments.length > 0;

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
            Assessment history
          </h1>
          {data.current_stage && (
            <p className="text-sm text-attooh-muted mt-1.5">
              Current stage:{' '}
              <span className="font-medium text-attooh-charcoal">{data.current_stage}</span>
            </p>
          )}
        </div>
        <Link
          to="/assessments"
          className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
        >
          Take another →
        </Link>
      </header>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
          Stage progression
        </h2>
        <HistoryTimeline progression={data.stage_progression} />
      </section>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
          All submissions
        </h2>
        {!hasAny ? (
          <p className="text-attooh-muted">No assessments yet.</p>
        ) : (
          <ul className="divide-y divide-attooh-border bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm">
            {data.assessments.map((a) => (
              <li key={a.assessment_id} className="p-5 flex items-center justify-between">
                <div>
                  <Link
                    to={`/assessments/results/${a.assessment_id}`}
                    className="text-base font-semibold text-attooh-charcoal hover:text-attooh-lime-hover"
                  >
                    {typeLabel[a.assessment_type] ?? a.assessment_type}
                  </Link>
                  <p className="text-sm text-attooh-muted">{formatDate(a.created_at)}</p>
                </div>
                <div className="text-right">
                  {a.calculated_stage && (
                    <p className="text-sm font-bold text-attooh-charcoal">{a.calculated_stage}</p>
                  )}
                  {a.band && <p className="text-sm font-bold text-attooh-charcoal">{a.band}</p>}
                  <p className="text-xs text-attooh-muted">Score {a.total_score}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppLayout>
  );
};
