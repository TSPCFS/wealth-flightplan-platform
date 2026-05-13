import React, { useEffect, useMemo, useState } from 'react';
import { contentService } from '../../services/content.service';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type {
  CalculatorType,
  ExampleFilters,
  ExampleSummary,
  Stage,
  StepNumber,
} from '../../types/content.types';
import { FormError } from '../common/FormError';
import { AppLayout } from '../common/AppLayout';
import { ExampleCard } from './ExampleCard';

const STEP_OPTIONS: StepNumber[] = ['1', '2', '3', '4a', '4b', '5', '6'];
const STAGE_OPTIONS: Stage[] = ['Foundation', 'Momentum', 'Freedom', 'Independence', 'Abundance'];
const CALC_OPTIONS: { value: CalculatorType; label: string }[] = [
  { value: 'compound_interest', label: 'Compound interest' },
  { value: 'debt_analysis', label: 'Debt analysis' },
  { value: 'budget_allocator', label: 'Budget allocator' },
  { value: 'net_worth_analyzer', label: 'Net worth analyzer' },
];

export const ExampleBrowser: React.FC = () => {
  const [step, setStep] = useState<StepNumber | ''>('');
  const [stage, setStage] = useState<Stage | ''>('');
  const [calc, setCalc] = useState<CalculatorType | ''>('');
  const [hasCalc, setHasCalc] = useState(false);
  const [q, setQ] = useState('');
  const [examples, setExamples] = useState<ExampleSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(q, 300);

  const filters: ExampleFilters = useMemo(() => {
    const f: ExampleFilters = {};
    if (step) f.step_number = step;
    if (stage) f.stage = stage;
    if (calc) f.calculator_type = calc;
    if (hasCalc) f.has_calculator = true;
    if (debouncedQ.trim()) f.q = debouncedQ.trim();
    return f;
  }, [step, stage, calc, hasCalc, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    contentService
      .listExamples(filters)
      .then((res) => {
        if (cancelled) return;
        setExamples(res.examples);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message || 'Could not load examples.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const clearFilters = () => {
    setStep('');
    setStage('');
    setCalc('');
    setHasCalc(false);
    setQ('');
  };

  const filtersActive = step || stage || calc || hasCalc || q;

  const labelCls = 'block font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate';
  const fieldCls =
    'mt-1.5 block w-full px-3.5 py-2.5 border-[1.5px] border-attooh-border rounded-lg text-sm text-attooh-charcoal bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale';

  return (
    <AppLayout maxWidth="wide" className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-montserrat text-2xl sm:text-[36px] font-bold text-attooh-charcoal tracking-tight break-words">
            Worked examples
          </h1>
          <p className="text-base text-attooh-muted mt-1">
            Scenarios that illustrate each step of the framework.
          </p>
        </div>
        <span className="font-lato text-[11px] uppercase tracking-wider text-attooh-muted">
          {loading ? 'Loading…' : `${total} example${total === 1 ? '' : 's'}`}
        </span>
      </header>

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <label className="block">
            <span className={labelCls}>Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="title, principle, keywords"
              className={fieldCls}
            />
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
            <span className={labelCls}>Calculator type</span>
            <select
              value={calc}
              onChange={(e) => setCalc(e.target.value as CalculatorType | '')}
              className={fieldCls}
            >
              <option value="">Any</option>
              {CALC_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={hasCalc}
              onChange={(e) => setHasCalc(e.target.checked)}
              className="h-4 w-4 rounded border-attooh-border text-attooh-lime focus:ring-attooh-lime"
            />
            <span className="text-sm text-attooh-charcoal">Has calculator</span>
          </label>
        </div>

        {filtersActive && (
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

      {examples && examples.length === 0 && !loading && (
        <p className="text-center text-attooh-muted py-8">
          No examples match. Try clearing filters.
        </p>
      )}

      {examples && examples.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {examples.map((ex) => (
            <ExampleCard key={ex.example_code} example={ex} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};
