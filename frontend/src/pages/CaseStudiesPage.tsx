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

  return (
    <AppLayout maxWidth="wide" className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Case studies</h1>
          <p className="text-gray-600 mt-1">
            Real-household scenarios that show the framework in motion.
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {loading ? 'Loading…' : `${total} stud${total === 1 ? 'y' : 'ies'}`}
        </span>
      </header>

      <section className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, situation, learning"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage | '')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <span className="text-xs font-medium text-gray-700">Step</span>
            <select
              value={step}
              onChange={(e) => setStep(e.target.value as StepNumber | '')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {error && <FormError error={error} />}

      {studies && studies.length === 0 && !loading && (
        <p className="text-center text-gray-600 py-8">
          No case studies match. Try clearing filters.
        </p>
      )}

      {studies && studies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {studies.map((study) => (
            <Link
              key={study.study_code}
              to={`/case-studies/${encodeURIComponent(study.study_code)}`}
              className="block bg-white rounded-lg shadow border border-transparent p-5 hover:border-blue-500 hover:shadow-md transition"
            >
              <div className="text-xs text-gray-500 mb-1">{study.study_code}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{study.name}</h3>
              <p className="text-sm text-gray-700 mb-2 line-clamp-3">{study.summary}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{study.learning}</p>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};
