import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DebtAnalysisOutput } from '../../../types/content.types';
import { chartColors } from '../../../styles/chart-theme';
import { formatCurrency, formatInteger, formatPercent } from '../../../utils/format';
import { KpiCard } from './KpiCard';

interface Props {
  outputs: DebtAnalysisOutput;
}

export const DebtAnalysisResult: React.FC<Props> = ({ outputs }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard
        label="Debt-free in"
        value={`${formatInteger(outputs.debt_free_months)} months`}
        tone="primary"
      />
      <KpiCard
        label="Total interest paid"
        value={formatCurrency(outputs.total_interest_paid)}
        tone="warn"
      />
      <KpiCard
        label="Weighted avg rate"
        value={formatPercent(outputs.weighted_average_rate_pct)}
        tone="neutral"
      />
    </div>

    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Total balance over time</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={outputs.monthly_projection}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `R${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Line
              type="monotone"
              dataKey="total_balance"
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={false}
              name="Balance"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment order</h3>
      <ol className="space-y-2 list-decimal list-inside">
        {outputs.payment_order.map((row, idx) => (
          <li key={`${row.name}-${idx}`} className="text-sm text-gray-800">
            <span className="font-medium">{row.name}</span>
            <span className="text-gray-500">
              {' '}
              · {formatCurrency(row.balance)} @ {formatPercent(row.annual_rate_pct)}
            </span>
            <span className="text-gray-500"> · closes month {row.expected_close_month}</span>
            <p className="text-xs text-gray-500 mt-0.5">{row.reason}</p>
          </li>
        ))}
      </ol>
    </div>
  </div>
);
