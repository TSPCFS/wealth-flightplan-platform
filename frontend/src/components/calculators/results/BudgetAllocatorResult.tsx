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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Surplus / deficit"
          value={formatCurrency(outputs.surplus_deficit)}
          tone={surplusTone(outputs.status)}
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

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Actual vs target</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
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
        <div className="bg-blue-50 ring-1 ring-blue-100 rounded-lg p-4 text-sm text-blue-900">
          {outputs.feedback}
        </div>
      )}
    </div>
  );
};
