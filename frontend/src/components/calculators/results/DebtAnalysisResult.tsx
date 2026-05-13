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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="Debt-free in"
        value={`${formatInteger(outputs.debt_free_months)} months`}
        featured
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

    <div className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
      <h3 className="text-sm font-bold text-attooh-charcoal mb-1">Total balance over time</h3>
      <p className="text-xs text-attooh-muted mb-5">Projected outstanding balance month-by-month</p>
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={outputs.monthly_projection}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartColors.neutral }} />
            <YAxis
              tick={{ fontSize: 12, fill: chartColors.neutral }}
              tickFormatter={(v) => `R${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Line
              type="monotone"
              dataKey="total_balance"
              stroke="#7AB016"
              strokeWidth={3}
              dot={false}
              name="Balance"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
      <h3 className="text-sm font-bold text-attooh-charcoal mb-4">Payment order</h3>
      <ol className="space-y-2.5 list-decimal list-inside marker:text-attooh-lime-hover marker:font-bold">
        {outputs.payment_order.map((row, idx) => (
          <li key={`${row.name}-${idx}`} className="text-sm text-attooh-charcoal">
            <span className="font-medium">{row.name}</span>
            <span className="text-attooh-muted">
              {' '}
              · {formatCurrency(row.balance)} @ {formatPercent(row.annual_rate_pct)}
            </span>
            <span className="text-attooh-muted"> · closes month {row.expected_close_month}</span>
            <p className="text-xs text-attooh-muted mt-0.5 ml-6">{row.reason}</p>
          </li>
        ))}
      </ol>
    </div>
  </div>
);
