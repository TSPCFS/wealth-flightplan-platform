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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Final amount" value={formatCurrency(outputs.final_amount)} tone="primary" />
        <KpiCard
          label="Monthly passive income"
          value={formatCurrency(outputs.monthly_passive_income)}
          tone="secondary"
        />
        <KpiCard label="Total contributed" value={formatCurrency(outputs.total_contributed)} />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Year-by-year growth</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={outputs.year_by_year}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
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
                stroke={chartColors.neutral}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="growth_to_date"
                name="Growth"
                stroke={chartColors.secondary}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <button
          type="button"
          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
        >
          <span>Year-by-year table</span>
          <span aria-hidden="true">{showTable ? '−' : '+'}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto max-h-96 border-t border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">Year</th>
                  <th className="text-right px-4 py-2">Balance</th>
                  <th className="text-right px-4 py-2">Contributions</th>
                  <th className="text-right px-4 py-2">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
