import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { contentService } from '../services/content.service';
import type { CaseStudyDetail } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { formatCurrency } from '../utils/format';
import { AppLayout } from '../components/common/AppLayout';

export const CaseStudyDetailPage: React.FC = () => {
  const { studyCode } = useParams<{ studyCode: string }>();
  const [study, setStudy] = useState<CaseStudyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyCode) {
      setError('Missing study code');
      return;
    }
    let cancelled = false;
    contentService
      .getCaseStudy(studyCode)
      .then((res) => !cancelled && setStudy(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load case study.'));
    return () => {
      cancelled = true;
    };
  }, [studyCode]);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link to="/case-studies" className="text-blue-600 underline">
            Back to case studies
          </Link>
        </div>
      </AppLayout>
    );
  }
  if (!study) return <LoadingSpinner />;

  const income =
    study.income_monthly === null || study.income_monthly === undefined
      ? 'Not disclosed'
      : `${formatCurrency(study.income_monthly)}/month`;

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <Link to="/case-studies" className="text-sm text-blue-600 underline">
          ← Case studies
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 break-words">{study.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {study.study_code} · Age band: {study.age_band || '—'} · Income: {income}
        </p>
      </header>

      {study.stage_relevance.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {study.stage_relevance.map((s) => (
            <span
              key={s}
              className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Situation
        </h2>
        <p className="text-gray-800">{study.situation}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Learning
        </h2>
        <p className="text-gray-800">{study.learning}</p>
      </section>

      {study.key_insight && (
        <section className="bg-emerald-50 ring-1 ring-emerald-100 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">
            Key insight
          </p>
          <p className="text-sm text-emerald-900">{study.key_insight}</p>
        </section>
      )}

      {study.related_example_codes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Related examples
          </h2>
          <ul className="flex flex-wrap gap-2">
            {study.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
                >
                  {code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
};
