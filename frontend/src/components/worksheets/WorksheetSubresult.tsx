import React from 'react';
import type {
  BudgetAllocatorOutput,
  DebtAnalysisOutput,
  NetWorthAnalyzerOutput,
} from '../../types/content.types';
import type {
  WorksheetCalculatedValues,
  WorksheetCode,
} from '../../types/worksheet.types';
import { BudgetAllocatorResult } from '../calculators/results/BudgetAllocatorResult';
import { DebtAnalysisResult } from '../calculators/results/DebtAnalysisResult';
import { NetWorthAnalyzerResult } from '../calculators/results/NetWorthAnalyzerResult';
import { CalculatedValuesPanel } from './CalculatedValuesPanel';

interface Props {
  worksheetCode: WorksheetCode;
  values: WorksheetCalculatedValues;
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const adaptBudgetAllocator = (
  values: Record<string, unknown>
): BudgetAllocatorOutput => {
  const needsPct = num(values['needs_pct']);
  const wantsPct = num(values['wants_pct']);
  const investPct = num(values['invest_pct']);
  return {
    total_income: num(values['total_income']),
    total_allocated:
      num(values['total_allocated']) ||
      num(values['total_needs']) + num(values['total_wants']) + num(values['total_invest']),
    surplus_deficit: num(values['surplus_deficit']),
    needs_pct: needsPct,
    wants_pct: wantsPct,
    invest_pct: investPct,
    status: (str(values['status']) as BudgetAllocatorOutput['status']) || 'balanced',
    feedback: str(values['feedback']),
    target_comparison: Array.isArray(values['target_comparison'])
      ? (values['target_comparison'] as BudgetAllocatorOutput['target_comparison'])
      : [
          {
            category: 'needs',
            actual_pct: needsPct,
            target_pct: 50,
            status:
              Math.abs(needsPct - 50) <= 5 ? 'on_track' : needsPct > 50 ? 'high' : 'low',
          },
          {
            category: 'wants',
            actual_pct: wantsPct,
            target_pct: 30,
            status:
              Math.abs(wantsPct - 30) <= 5 ? 'on_track' : wantsPct > 30 ? 'high' : 'low',
          },
          {
            category: 'invest',
            actual_pct: investPct,
            target_pct: 20,
            status:
              Math.abs(investPct - 20) <= 5 ? 'on_track' : investPct > 20 ? 'high' : 'low',
          },
        ],
  };
};

const adaptNetWorth = (values: Record<string, unknown>): NetWorthAnalyzerOutput => ({
  total_lifestyle_assets: num(values['total_lifestyle_assets']),
  total_income_generating_assets: num(values['total_income_generating_assets']),
  total_assets:
    num(values['total_assets']) ||
    num(values['total_lifestyle_assets']) + num(values['total_income_generating_assets']),
  total_liabilities: num(values['total_liabilities']),
  net_worth: num(values['net_worth']),
  income_generating_pct_of_net_worth: num(
    values['income_generating_pct_of_net_worth']
  ),
  interpretation: str(values['interpretation']),
});

const adaptDebt = (values: Record<string, unknown>): DebtAnalysisOutput => ({
  total_debt: num(values['total_debt']),
  weighted_average_rate_pct: num(values['weighted_average_rate_pct']),
  total_monthly_minimums: num(values['total_monthly_minimums']),
  debt_free_months: num(values['debt_free_months']),
  total_interest_paid: num(values['total_interest_paid']),
  payment_order: Array.isArray(values['payment_order'])
    ? (values['payment_order'] as DebtAnalysisOutput['payment_order'])
    : [],
  monthly_projection: Array.isArray(values['monthly_projection'])
    ? (values['monthly_projection'] as DebtAnalysisOutput['monthly_projection'])
    : [],
});

export const WorksheetSubresult: React.FC<Props> = ({ worksheetCode, values }) => {
  if (!values) return null;
  const v = values as Record<string, unknown>;

  switch (worksheetCode) {
    case 'APP-A':
      return <BudgetAllocatorResult outputs={adaptBudgetAllocator(v)} />;
    case 'APP-B':
      return <NetWorthAnalyzerResult outputs={adaptNetWorth(v)} />;
    case 'APP-D':
      return <DebtAnalysisResult outputs={adaptDebt(v)} />;
    default:
      return <CalculatedValuesPanel values={values} />;
  }
};
