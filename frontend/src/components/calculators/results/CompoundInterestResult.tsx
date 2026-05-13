import React, { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CompoundInterestOutput } from '../../../types/content.types';
import { chartColors } from '../../../styles/chart-theme';
import { formatCurrency } from '../../../utils/format';
import { KpiCard } from './KpiCard';

interface Props {
  outputs: CompoundInterestOutput;
}

export const CompoundInterestResult: React.FC<Props> = ({ outputs }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Final amount" value={formatCurrency(outputs.final_amount)} />
        <KpiCard
          label="Monthly passive income"
          value={formatCurrency(outputs.monthly_passive_income)}
          tone="primary"
          featured
        />
        <KpiCard label="Total contributed" value={formatCurrency(outputs.total_contributed)} />
      </div>

      <div className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
        <h3 className="text-sm font-bold text-attooh-charcoal mb-1">Year-by-year growth</h3>
        <p className="text-xs text-attooh-muted mb-5">
          Contributions vs growth vs total balance over the horizon
        </p>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={outputs.year_by_year}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: chartColors.neutral }} />
              <YAxis
                tick={{ fontSize: 12, fill: chartColors.neutral }}
                tickFormatter={(v) => `R${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="contributions_to_date"
                name="Contributions"
                stroke="#505E6B"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="growth_to_date"
                name="Growth"
                stroke="#4F9C2C"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="#7AB016"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm">
        <button
          type="button"
          className="w-full text-left px-5 py-3.5 text-sm font-semibold text-attooh-charcoal hover:bg-attooh-lime-pale flex items-center justify-between rounded-xl"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
        >
          <span>Year-by-year table</span>
          <span aria-hidden="true">{showTable ? '−' : '+'}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto max-h-96 border-t border-attooh-border">
            <table className="min-w-full text-sm">
              <thead className="bg-attooh-bg font-lato text-xs uppercase tracking-wider text-attooh-slate">
                <tr>
                  <th className="text-left px-4 py-2.5">Year</th>
                  <th className="text-right px-4 py-2.5">Balance</th>
                  <th className="text-right px-4 py-2.5">Contributions</th>
                  <th className="text-right px-4 py-2.5">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-attooh-border">
                {outputs.year_by_year.map((row) => (
                  <tr key={row.year}>
                    <td className="px-4 py-2">{row.year}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(row.contributions_to_date)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(row.growth_to_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
