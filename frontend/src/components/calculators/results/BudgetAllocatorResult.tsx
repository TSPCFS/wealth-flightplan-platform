import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BudgetAllocatorOutput } from '../../../types/content.types';
import { budgetStatusColors, chartColors } from '../../../styles/chart-theme';
import { formatCurrency, formatPercent } from '../../../utils/format';
import { KpiCard } from './KpiCard';

interface Props {
  outputs: BudgetAllocatorOutput;
}

const surplusTone = (status: BudgetAllocatorOutput['status']) =>
  status === 'balanced' ? 'secondary' : status === 'deficit' ? 'danger' : 'primary';

export const BudgetAllocatorResult: React.FC<Props> = ({ outputs }) => {
  const data = outputs.target_comparison.map((row) => ({
    name:
      row.category === 'needs'
        ? 'Needs'
        : row.category === 'wants'
          ? 'Wants'
          : 'Invest',
    actual: row.actual_pct,
    target: row.target_pct,
    status: row.status,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Surplus / deficit"
          value={formatCurrency(outputs.surplus_deficit)}
          tone={surplusTone(outputs.status)}
          featured={outputs.status === 'balanced'}
          sublabel={
            outputs.status === 'balanced'
              ? 'Income matches allocation'
              : outputs.status === 'deficit'
                ? 'You are over budget'
                : 'You have unallocated income'
          }
        />
        <KpiCard label="Total income" value={formatCurrency(outputs.total_income)} />
        <KpiCard label="Total allocated" value={formatCurrency(outputs.total_allocated)} />
      </div>

      <div className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
        <h3 className="text-sm font-bold text-attooh-charcoal mb-1">Actual vs target</h3>
        <p className="text-xs text-attooh-muted mb-5">By category, as a percentage of income</p>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartColors.neutral }} />
              <YAxis
                tick={{ fontSize: 12, fill: chartColors.neutral }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v: number) => formatPercent(v)} />
              <Legend />
              <Bar dataKey="actual" name="Actual">
                {data.map((row, idx) => (
                  <Cell key={idx} fill={budgetStatusColors[row.status]} />
                ))}
              </Bar>
              <Bar dataKey="target" name="Target" fill={chartColors.neutral} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {outputs.feedback && (
        <div className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-5">
          <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-success mb-1">
            Feedback
          </p>
          <p className="text-sm text-attooh-charcoal">{outputs.feedback}</p>
        </div>
      )}
    </div>
  );
};
