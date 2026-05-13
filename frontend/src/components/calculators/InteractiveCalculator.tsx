import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalculateInputs,
  CalculateResponse,
  CalculatorInputSpec,
  ExampleDetail,
} from '../../types/content.types';
import { contentService } from '../../services/content.service';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { CompoundInterestResult } from './results/CompoundInterestResult';
import { DebtAnalysisResult } from './results/DebtAnalysisResult';
import { BudgetAllocatorResult } from './results/BudgetAllocatorResult';
import { NetWorthAnalyzerResult } from './results/NetWorthAnalyzerResult';
import { ArrayInput } from './ArrayInput';

// Normalize `options` from either string[] (backend's compact form)
// or {value,label}[] (contract's explicit form) into the explicit form.
const normalizeOptions = (
  options: { value: string; label: string }[] | string[] | undefined
): { value: string; label: string }[] => {
  if (!options) return [];
  return options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
};

interface Props {
  exampleDetail: ExampleDetail;
}

type FieldValue = number | string | Record<string, unknown>[];

const isNumberInput = (spec: CalculatorInputSpec): boolean => spec.type === 'number';

const initialFromSpec = (spec: CalculatorInputSpec): FieldValue => {
  if (spec.type === 'array') {
    return Array.isArray(spec.default) ? (spec.default as Record<string, unknown>[]) : [];
  }
  if (spec.type === 'select') {
    const fallback = normalizeOptions(spec.options)[0]?.value ?? '';
    return (spec.default as string) ?? fallback;
  }
  if (spec.type === 'text') {
    return typeof spec.default === 'string' ? spec.default : '';
  }
  return typeof spec.default === 'number' ? spec.default : 0;
};

const buildInitialValues = (
  inputs: CalculatorInputSpec[]
): Record<string, FieldValue> => {
  const out: Record<string, FieldValue> = {};
  for (const spec of inputs) out[spec.name] = initialFromSpec(spec);
  return out;
};

const valuesToInputsPayload = (
  values: Record<string, FieldValue>
): CalculateInputs => values as unknown as CalculateInputs;

// Format Number values by inspecting an inputs map produced server-side.
// Falls back to a sensible default if the placeholder doesn't resolve.
const renderInterpretation = (
  template: string | undefined,
  payload: { inputs: Record<string, unknown>; outputs: Record<string, unknown> }
): string => {
  if (!template) return '';
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const v = payload.inputs[key] ?? payload.outputs[key];
    if (v === undefined || v === null) return `{${key}}`;
    if (typeof v === 'number') return v.toLocaleString();
    return String(v);
  });
};

export const InteractiveCalculator: React.FC<Props> = ({ exampleDetail }) => {
  const config = exampleDetail.calculator_config;
  const initial = useMemo(
    () => (config ? buildInitialValues(config.inputs) : {}),
    [config]
  );
  const [values, setValues] = useState<Record<string, FieldValue>>(initial);
  const [response, setResponse] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');

  const debouncedValues = useDebouncedValue(values, 400);
  const reqIdRef = useRef(0);
  // Dedupe by payload; handles both the "hasSubmitted just flipped to true"
  // initial-effect fire and the case where debouncedValues catches up to a
  // payload we already submitted directly.
  const lastCalledKeyRef = useRef<string | null>(null);

  const runCalculation = async (payload: Record<string, FieldValue>) => {
    if (!config) return;
    const key = JSON.stringify(payload);
    if (key === lastCalledKeyRef.current) return;
    lastCalledKeyRef.current = key;

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await contentService.calculate(
        exampleDetail.example_code,
        valuesToInputsPayload(payload)
      );
      // Drop late responses so a slow request doesn't overwrite a fresher one.
      if (reqIdRef.current !== reqId) return;
      setResponse(res);
    } catch (err) {
      if (reqIdRef.current !== reqId) return;
      const apiErr = err as { message?: string; code?: string };
      setError(apiErr.message || 'Calculation failed.');
      lastCalledKeyRef.current = null;
    } finally {
      if (reqIdRef.current === reqId) setLoading(false);
    }
  };

  // After the first explicit submit, recompute on each (debounced) value change.
  useEffect(() => {
    if (!hasSubmitted) return;
    runCalculation(debouncedValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, debouncedValues]);

  if (!config) {
    return (
      <div className="bg-amber-50 ring-1 ring-amber-100 rounded-lg p-4 text-sm text-amber-900">
        This example is educational only. No calculator is configured.
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    runCalculation(values);
  };

  const onReset = () => {
    setValues(initial);
    setResponse(null);
    setHasSubmitted(false);
    setError(null);
    lastCalledKeyRef.current = null;
  };

  const onCopyInterpretation = async () => {
    if (!response) return;
    const text = renderInterpretation(config.interpretation_template, {
      inputs: response.inputs as unknown as Record<string, unknown>,
      outputs: response.outputs as unknown as Record<string, unknown>,
    });
    const fallback = response.interpretation;
    const toCopy = text || fallback;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopiedMsg('Copied');
    } catch {
      setCopiedMsg('Press Ctrl/Cmd-C to copy');
    }
    setTimeout(() => setCopiedMsg(''), 2000);
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow p-4 space-y-4"
        aria-label="Calculator inputs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.inputs.map((spec) =>
            isNumberInput(spec) ? (
              <label key={spec.name} className="block">
                <span className="text-sm font-medium text-gray-700">{spec.label}</span>
                <input
                  type="number"
                  value={(values[spec.name] as number) ?? 0}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step ?? 1}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [spec.name]:
                        e.target.value === '' ? 0 : Number(e.target.value),
                    }))
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {spec.description && (
                  <p className="text-xs text-gray-500 mt-1">{spec.description}</p>
                )}
              </label>
            ) : spec.type === 'select' ? (
              <label key={spec.name} className="block">
                <span className="text-sm font-medium text-gray-700">{spec.label}</span>
                <select
                  value={(values[spec.name] as string) ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [spec.name]: e.target.value }))
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {normalizeOptions(spec.options).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : spec.type === 'array' ? (
              <ArrayInput
                key={spec.name}
                spec={spec}
                value={(values[spec.name] as Record<string, unknown>[]) ?? []}
                onChange={(rows) =>
                  setValues((prev) => ({ ...prev, [spec.name]: rows }))
                }
              />
            ) : spec.type === 'text' ? (
              <label key={spec.name} className="block">
                <span className="text-sm font-medium text-gray-700">{spec.label}</span>
                <input
                  type="text"
                  value={(values[spec.name] as string) ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [spec.name]: e.target.value }))
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
            ) : null
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Calculating…' : hasSubmitted ? 'Recalculate' : 'Calculate'}
          </Button>
          <Button type="button" variant="secondary" onClick={onReset} disabled={loading}>
            Reset to defaults
          </Button>
          {response && (
            <Button type="button" variant="secondary" onClick={onCopyInterpretation}>
              Copy interpretation
            </Button>
          )}
          {copiedMsg && <span className="text-xs text-gray-500">{copiedMsg}</span>}
        </div>
      </form>

      {error && <FormError error={error} />}

      {response && response.calculator_type === 'compound_interest' && (
        <CompoundInterestResult outputs={response.outputs} />
      )}
      {response && response.calculator_type === 'debt_analysis' && (
        <DebtAnalysisResult outputs={response.outputs} />
      )}
      {response && response.calculator_type === 'budget_allocator' && (
        <BudgetAllocatorResult outputs={response.outputs} />
      )}
      {response && response.calculator_type === 'net_worth_analyzer' && (
        <NetWorthAnalyzerResult outputs={response.outputs} />
      )}

      {response?.interpretation && (
        <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-800">
          {response.interpretation}
        </div>
      )}
    </div>
  );
};
