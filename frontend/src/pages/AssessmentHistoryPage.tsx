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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Assessment history</h1>
          {data.current_stage && (
            <p className="text-sm text-gray-600 mt-1">
              Current stage: <span className="font-medium">{data.current_stage}</span>
            </p>
          )}
        </div>
        <Link
          to="/assessments"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
        >
          Take another
        </Link>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Stage progression
        </h2>
        <HistoryTimeline progression={data.stage_progression} />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          All submissions
        </h2>
        {!hasAny ? (
          <p className="text-gray-600">No assessments yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow">
            {data.assessments.map((a) => (
              <li key={a.assessment_id} className="p-4 flex items-center justify-between">
                <div>
                  <Link
                    to={`/assessments/results/${a.assessment_id}`}
                    className="text-base font-medium text-gray-900 hover:text-blue-700"
                  >
                    {typeLabel[a.assessment_type] ?? a.assessment_type}
                  </Link>
                  <p className="text-sm text-gray-500">{formatDate(a.created_at)}</p>
                </div>
                <div className="text-right">
                  {a.calculated_stage && (
                    <p className="text-sm font-medium text-gray-900">{a.calculated_stage}</p>
                  )}
                  {a.band && <p className="text-sm font-medium text-gray-900">{a.band}</p>}
                  <p className="text-xs text-gray-500">Score {a.total_score}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppLayout>
  );
};
