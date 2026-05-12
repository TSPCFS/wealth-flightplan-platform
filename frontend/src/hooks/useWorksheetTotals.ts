import { useMemo } from 'react';
import type {
  WorksheetResponseData,
  WorksheetSchema,
  WorksheetSection,
} from '../types/worksheet.types';
import { isArraySection } from '../types/worksheet.types';

const toNumber = (v: unknown): number => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const parsed = typeof v === 'string' ? Number(v) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Sum every numeric cell inside a section. For scalar sections that's the
// fields with type:'number'; for array sections it's every numeric column
// across every row. Pure client-side derivation — the server stays authoritative.
const sumSection = (
  section: WorksheetSection,
  data: WorksheetResponseData
): number => {
  if (isArraySection(section)) {
    const rows = (data[section.name] as Record<string, unknown>[] | undefined) ?? [];
    const numericCols =
      section.item_schema?.filter((c) => c.type === 'number').map((c) => c.name) ?? [];
    let sum = 0;
    for (const row of rows) {
      for (const col of numericCols) sum += toNumber(row?.[col]);
    }
    return sum;
  }
  const sectionData = (data[section.name] as Record<string, unknown> | undefined) ?? {};
  let sum = 0;
  for (const field of section.fields ?? []) {
    if (field.type === 'number') sum += toNumber(sectionData[field.name]);
  }
  return sum;
};

export interface WorksheetTotals {
  bySection: Record<string, number>;
  completionPct: number;
}

// Completion = filled-required / total-required, expressed 0-100.
//
// Per the API contract pin (commit 794254a + 9e0a4cf): a scalar leaf is
// "filled" if its value is non-null AND (for type:number) is a finite number,
// (for type:text|select) is a non-empty string. NB: 0 IS a filled number —
// many worksheet fields legitimately have zero values (no secondary earner,
// no store account, etc.) and the user must be able to submit without being
// forced to type non-zero in fields that don't apply. The BE recomputes the
// same way on /submit, so this hook stays in lock-step.
export const computeCompletionPct = (
  schema: WorksheetSchema,
  data: WorksheetResponseData
): number => {
  let total = 0;
  let filled = 0;

  const numberIsFilled = (v: unknown): boolean =>
    typeof v === 'number' && Number.isFinite(v);
  const stringIsFilled = (v: unknown): boolean =>
    typeof v === 'string' && v.trim().length > 0;

  for (const section of schema.sections) {
    if (isArraySection(section)) {
      // An array section is "filled" iff at least min_items rows are present
      // and each row has every required column populated.
      const rows = (data[section.name] as Record<string, unknown>[] | undefined) ?? [];
      const minItems = section.min_items ?? 1;
      total += 1;
      if (rows.length >= minItems) {
        const requiredCols = section.item_schema ?? [];
        const allComplete = rows.every((row) =>
          requiredCols.every((col) => {
            const v = row?.[col.name];
            return col.type === 'number' ? numberIsFilled(v) : stringIsFilled(v);
          })
        );
        if (allComplete) filled += 1;
      }
      continue;
    }
    const sectionData = (data[section.name] as Record<string, unknown> | undefined) ?? {};
    for (const field of section.fields ?? []) {
      total += 1;
      const v = sectionData[field.name];
      const isFilled = field.type === 'number' ? numberIsFilled(v) : stringIsFilled(v);
      if (isFilled) filled += 1;
    }
  }

  if (total === 0) return 100;
  return Math.round((filled / total) * 100);
};

export const useWorksheetTotals = (
  schema: WorksheetSchema | null,
  data: WorksheetResponseData
): WorksheetTotals => {
  return useMemo(() => {
    if (!schema) return { bySection: {}, completionPct: 0 };
    const bySection: Record<string, number> = {};
    for (const section of schema.sections) {
      bySection[section.name] = sumSection(section, data);
    }
    return {
      bySection,
      completionPct: computeCompletionPct(schema, data),
    };
  }, [schema, data]);
};
