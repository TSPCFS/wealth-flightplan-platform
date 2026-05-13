import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { contentService } from '../services/content.service';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type {
  CaseStudyFilters,
  CaseStudySummary,
  Stage,
  StepNumber,
} from '../types/content.types';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const STEP_OPTIONS: StepNumber[] = ['1', '2', '3', '4a', '4b', '5', '6'];
const STAGE_OPTIONS: Stage[] = ['Foundation', 'Momentum', 'Freedom', 'Independence', 'Abundance'];

export const CaseStudiesPage: React.FC = () => {
  useDocumentTitle('Case studies');
  const [stage, setStage] = useState<Stage | ''>('');
  const [step, setStep] = useState<StepNumber | ''>('');
  const [q, setQ] = useState('');
  const [studies, setStudies] = useState<CaseStudySummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(q, 300);

  const filters: CaseStudyFilters = useMemo(() => {
    const f: CaseStudyFilters = {};
    if (stage) f.stage = stage;
    if (step) f.step_number = step;
    if (debouncedQ.trim()) f.q = debouncedQ.trim();
    return f;
  }, [stage, step, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    contentService
      .listCaseStudies(filters)
      .then((res) => {
        if (cancelled) return;
        setStudies(res.case_studies);
        setTotal(res.total);
      })
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load case studies.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const clearFilters = () => {
    setStage('');
    setStep('');
    setQ('');
  };

  const labelCls = 'block font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate';
  const fieldCls =
    'mt-1.5 block w-full px-3.5 py-2.5 border-[1.5px] border-attooh-border rounded-lg text-sm text-attooh-charcoal bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale';

  return (
    <AppLayout maxWidth="wide" className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-montserrat text-2xl sm:text-[36px] font-bold text-attooh-charcoal tracking-tight break-words">
            Case studies
          </h1>
          <p className="text-base text-attooh-muted mt-1">
            Real-household scenarios that show the framework in motion.
          </p>
        </div>
        <span className="font-lato text-[11px] uppercase tracking-wider text-attooh-muted">
          {loading ? 'Loading…' : `${total} stud${total === 1 ? 'y' : 'ies'}`}
        </span>
      </header>

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className={labelCls}>Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, situation, learning"
              className={fieldCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage | '')}
              className={fieldCls}
            >
              <option value="">All stages</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Step</span>
            <select
              value={step}
              onChange={(e) => setStep(e.target.value as StepNumber | '')}
              className={fieldCls}
            >
              <option value="">All steps</option>
              {STEP_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  Step {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(stage || step || q) && (
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={clearFilters}
              className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {error && <FormError error={error} />}

      {studies && studies.length === 0 && !loading && (
        <p className="text-center text-attooh-muted py-8">
          No case studies match. Try clearing filters.
        </p>
      )}

      {studies && studies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {studies.map((study) => (
            <Link
              key={study.study_code}
              to={`/case-studies/${encodeURIComponent(study.study_code)}`}
              className="group block bg-attooh-card rounded-xl border border-attooh-border p-6 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px]"
            >
              <div className="font-lato text-[11px] font-bold uppercase tracking-[0.16em] text-attooh-lime-hover mb-2">
                {study.study_code}
              </div>
              <h3 className="text-base font-bold text-attooh-charcoal mb-2">{study.name}</h3>
              <p className="text-sm text-attooh-charcoal mb-2 line-clamp-3">{study.summary}</p>
              <p className="text-xs text-attooh-muted line-clamp-2 italic">{study.learning}</p>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};
