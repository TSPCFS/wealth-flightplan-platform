import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { contentService } from '../services/content.service';
import type { CaseStudyDetail } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { formatCurrency } from '../utils/format';
import { AppLayout } from '../components/common/AppLayout';
import { SectionLabel } from '../components/common/SectionLabel';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const CaseStudyDetailPage: React.FC = () => {
  const { studyCode } = useParams<{ studyCode: string }>();
  const [study, setStudy] = useState<CaseStudyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(study ? `${study.study_code} · ${study.name}` : null);

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
          <Link
            to="/case-studies"
            className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Back to case studies
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
        <Link
          to="/case-studies"
          className="inline-flex items-center font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal mb-3"
        >
          ← Case studies
        </Link>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          {study.name}
        </h1>
        <p className="text-sm text-attooh-muted mt-1">
          {study.study_code} · Age band: {study.age_band || '–'} · Income: {income}
        </p>
      </header>

      {study.stage_relevance.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {study.stage_relevance.map((s) => (
            <span
              key={s}
              className="font-lato text-[11px] font-bold uppercase tracking-[0.1em] bg-attooh-lime-pale text-attooh-success px-3.5 py-1.5 rounded-full"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <section>
        <SectionLabel>Situation</SectionLabel>
        <p className="text-attooh-charcoal mt-3">{study.situation}</p>
      </section>

      <section>
        <SectionLabel>Learning</SectionLabel>
        <p className="text-attooh-charcoal mt-3">{study.learning}</p>
      </section>

      {study.key_insight && (
        <section className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-5">
          <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-success mb-1">
            Key insight
          </p>
          <p className="text-sm text-attooh-charcoal">{study.key_insight}</p>
        </section>
      )}

      {study.related_example_codes.length > 0 && (
        <section>
          <SectionLabel>Related examples</SectionLabel>
          <ul className="flex flex-wrap gap-2 mt-3">
            {study.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-attooh-success bg-attooh-lime-pale hover:bg-attooh-lime hover:text-attooh-charcoal px-3 py-1 rounded-full transition-colors"
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
