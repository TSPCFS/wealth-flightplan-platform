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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Worked examples</h1>
          <p className="text-gray-600 mt-1">
            Scenarios that illustrate each step of the framework.
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {loading ? 'Loading…' : `${total} example${total === 1 ? '' : 's'}`}
        </span>
      </header>

      <section className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="title, principle, keywords"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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
            <span className="text-xs font-medium text-gray-700">Calculator type</span>
            <select
              value={calc}
              onChange={(e) => setCalc(e.target.value as CalculatorType | '')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              {CALC_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              checked={hasCalc}
              onChange={(e) => setHasCalc(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800">Has calculator</span>
          </label>
        </div>

        {filtersActive && (
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

      {examples && examples.length === 0 && !loading && (
        <p className="text-center text-gray-600 py-8">
          No examples match. Try clearing filters.
        </p>
      )}

      {examples && examples.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((ex) => (
            <ExampleCard key={ex.example_code} example={ex} />
          ))}
        </div>
      )}
    </div>
  );
};
