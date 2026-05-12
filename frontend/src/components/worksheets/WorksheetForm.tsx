import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  WorksheetCode,
  WorksheetResponseData,
  WorksheetSchema,
} from '../../types/worksheet.types';
import { isArraySection } from '../../types/worksheet.types';
import { worksheetService } from '../../services/worksheet.service';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { computeCompletionPct, useWorksheetTotals } from '../../hooks/useWorksheetTotals';
import { ArrayInput } from '../calculators/ArrayInput';
import { WorksheetSectionFields } from './WorksheetSectionFields';

interface Props {
  schema: WorksheetSchema;
  initialData?: WorksheetResponseData;
}

const seedDataFromSchema = (schema: WorksheetSchema): WorksheetResponseData => {
  const data: WorksheetResponseData = {};
  for (const section of schema.sections) {
    if (isArraySection(section)) {
      data[section.name] = [];
    } else {
      const sec: Record<string, unknown> = {};
      for (const field of section.fields ?? []) {
        sec[field.name] =
          field.default !== undefined
            ? field.default
            : field.type === 'number'
              ? ''
              : '';
      }
      data[section.name] = sec;
    }
  }
  return data;
};

const flattenValidationDetails = (
  details: Record<string, string[]>
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [path, messages] of Object.entries(details)) {
    // The contract permits dotted paths (e.g. "needs.bond") or flat names.
    // We surface against whichever segment the renderer uses (last segment).
    const segs = path.split('.');
    const key = segs[segs.length - 1];
    out[key] = messages.join(' ');
  }
  return out;
};

const relativeTime = (date: Date | null): string => {
  if (!date) return '';
  const secs = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
};

export const WorksheetForm: React.FC<Props> = ({ schema, initialData }) => {
  const navigate = useNavigate();
  const seeded = useMemo(() => seedDataFromSchema(schema), [schema]);

  const [data, setData] = useState<WorksheetResponseData>(() => ({
    ...seeded,
    ...(initialData ?? {}),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  const totals = useWorksheetTotals(schema, data);
  const debouncedData = useDebouncedValue(data, 1000);
  const submittingRef = useRef(false);
  const lastSavedKeyRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  // Re-render the "saved Xs ago" label every 5 seconds so it stays current.
  useEffect(() => {
    const id = setInterval(() => setSavedTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Autosave: fires after 1s of stillness; skipped while submitting; deduped
  // by JSON payload so re-renders with identical state don't burn requests.
  // Note: we derive pct from `debouncedData` inside the effect rather than
  // depending on the live `totals.completionPct`, otherwise the effect would
  // re-fire on every keystroke (pct changes immediately) and bypass the debounce.
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (submittingRef.current) return;
    const pct = computeCompletionPct(schema, debouncedData);
    const key = JSON.stringify({ data: debouncedData, pct });
    if (key === lastSavedKeyRef.current) return;
    lastSavedKeyRef.current = key;

    // Wrap in Promise.resolve so a synchronous mock that returns undefined
    // doesn't crash the render commit phase with "cannot read .then".
    Promise.resolve(
      worksheetService.saveDraft(schema.worksheet_code as WorksheetCode, debouncedData, pct)
    )
      .then(() => setLastSavedAt(new Date()))
      .catch(() => {
        // Non-fatal: the user can still submit. Reset the key so the next
        // change retries (otherwise we'd hold the stale failed key forever).
        lastSavedKeyRef.current = null;
      });
  }, [debouncedData, schema]);

  const onFieldChange = useCallback(
    (sectionName: string, fieldName: string, next: unknown) => {
      dirtyRef.current = true;
      setData((prev) => {
        const section = (prev[sectionName] as Record<string, unknown>) ?? {};
        return { ...prev, [sectionName]: { ...section, [fieldName]: next } };
      });
      setErrors((prev) => {
        if (!(fieldName in prev)) return prev;
        const rest = { ...prev };
        delete rest[fieldName];
        return rest;
      });
    },
    []
  );

  const onArrayChange = useCallback(
    (sectionName: string, rows: Record<string, unknown>[]) => {
      dirtyRef.current = true;
      setData((prev) => ({ ...prev, [sectionName]: rows }));
    },
    []
  );

  const onReset = () => {
    setData(seeded);
    setErrors({});
    setSubmitError(null);
    dirtyRef.current = true; // force an autosave of the cleared state
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totals.completionPct < 100) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      const submission = await worksheetService.submit(
        schema.worksheet_code as WorksheetCode,
        data
      );
      // Pass the submission via router state so the results page renders
      // without re-fetching — the contract doesn't expose a
      // GET /worksheets/{worksheet_id} endpoint today.
      navigate(`/worksheets/results/${submission.worksheet_id}`, {
        state: { submission },
      });
    } catch (err) {
      const apiErr = err as {
        code?: string;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (apiErr?.code === 'VALIDATION_ERROR' && apiErr.details) {
        setErrors(flattenValidationDetails(apiErr.details));
        setSubmitError('Some fields need attention.');
      } else {
        setSubmitError(apiErr?.message || 'Submission failed.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const submitDisabled = submitting || totals.completionPct < 100;
  const savedLabel = lastSavedAt ? `Draft saved ${relativeTime(lastSavedAt)}` : 'No draft saved';
  // savedTick: referenced so the interval triggers re-render for the label.
  void savedTick;

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-label={schema.title}>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{schema.title}</h1>
          {schema.description && (
            <p className="text-sm text-gray-600 mt-1">{schema.description}</p>
          )}
        </div>
        <span
          data-testid="autosave-indicator"
          className="text-xs text-gray-500"
          aria-live="polite"
        >
          {savedLabel}
        </span>
      </header>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${totals.completionPct}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={totals.completionPct}
          aria-label="Completion"
        />
      </div>

      {schema.sections.map((section) => (
        <section
          key={section.name}
          className="bg-white rounded-lg shadow p-5"
          aria-labelledby={`section-${section.name}-heading`}
        >
          <h2
            id={`section-${section.name}-heading`}
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {section.label}
          </h2>
          {section.description && (
            <p className="text-sm text-gray-500 mb-3">{section.description}</p>
          )}

          {isArraySection(section) ? (
            <ArrayInput
              spec={{
                name: section.name,
                label: section.label,
                type: 'array',
                item_schema: section.item_schema,
                min_items: section.min_items,
                max_items: section.max_items,
              }}
              value={(data[section.name] as Record<string, unknown>[]) ?? []}
              onChange={(rows) => onArrayChange(section.name, rows)}
            />
          ) : (
            <WorksheetSectionFields
              fields={section.fields ?? []}
              value={(data[section.name] as Record<string, unknown>) ?? {}}
              errors={errors}
              onChange={(fieldName, next) =>
                onFieldChange(section.name, fieldName, next)
              }
              sectionTotal={totals.bySection[section.name]}
            />
          )}
        </section>
      ))}

      <FormError error={submitError || undefined} />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-3">
          <Button type="submit" disabled={submitDisabled} aria-label="Submit worksheet">
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
          <Button type="button" variant="secondary" onClick={onReset} disabled={submitting}>
            Clear form
          </Button>
        </div>
        <span className="text-sm text-gray-600">
          {totals.completionPct}% complete
        </span>
      </div>
    </form>
  );
};
