import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { computeCompletionPct, useWorksheetTotals } from './useWorksheetTotals';
import type { WorksheetSchema } from '../types/worksheet.types';

const scalarSchema: WorksheetSchema = {
  worksheet_code: 'APP-A',
  title: 't',
  description: '',
  sections: [
    {
      name: 'income',
      label: 'Income',
      fields: [
        { name: 'salary_1', label: 'Salary 1', type: 'number', min: 0, format: 'currency' },
        { name: 'salary_2', label: 'Salary 2', type: 'number', min: 0, format: 'currency' },
      ],
    },
    {
      name: 'notes',
      label: 'Notes',
      fields: [{ name: 'comment', label: 'Comment', type: 'text' }],
    },
  ],
};

const arraySchema: WorksheetSchema = {
  worksheet_code: 'APP-D',
  title: 't',
  description: '',
  sections: [
    {
      name: 'debts',
      label: 'Debts',
      type: 'array',
      min_items: 1,
      max_items: 5,
      item_schema: [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'balance', label: 'Balance', type: 'number', min: 0, format: 'currency' },
      ],
    },
  ],
};

describe('useWorksheetTotals + computeCompletionPct', () => {
  it('sums numeric fields per scalar section', () => {
    const { result } = renderHook(() =>
      useWorksheetTotals(scalarSchema, {
        income: { salary_1: 45000, salary_2: 15000 },
        notes: { comment: 'hello' },
      })
    );
    expect(result.current.bySection.income).toBe(60000);
    expect(result.current.bySection.notes).toBe(0);
  });

  it('computes 0 completion for an empty form, 100 for a fully filled one', () => {
    expect(
      computeCompletionPct(scalarSchema, { income: {}, notes: {} })
    ).toBe(0);
    expect(
      computeCompletionPct(scalarSchema, {
        income: { salary_1: 45000, salary_2: 15000 },
        notes: { comment: 'hello' },
      })
    ).toBe(100);
  });

  it('treats an array section as complete only once min_items rows are populated', () => {
    expect(computeCompletionPct(arraySchema, { debts: [] })).toBe(0);
    expect(
      computeCompletionPct(arraySchema, {
        debts: [{ name: 'CC', balance: 15000 }],
      })
    ).toBe(100);
  });

  it('sums numeric columns across every row of an array section', () => {
    const { result } = renderHook(() =>
      useWorksheetTotals(arraySchema, {
        debts: [
          { name: 'CC', balance: 15000 },
          { name: 'Store', balance: 8000 },
        ],
      })
    );
    expect(result.current.bySection.debts).toBe(23000);
  });

  it('returns zeros when no schema is provided', () => {
    const { result } = renderHook(() => useWorksheetTotals(null, {}));
    expect(result.current.completionPct).toBe(0);
    expect(result.current.bySection).toEqual({});
  });
});
