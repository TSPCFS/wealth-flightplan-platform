import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { NetWorthAnalyzerOutput } from '../../../types/content.types';
import { netWorthColors } from '../../../styles/chart-theme';
import { formatCurrency, formatPercent } from '../../../utils/format';
import { KpiCard } from './KpiCard';

interface Props {
  outputs: NetWorthAnalyzerOutput;
}

export const NetWorthAnalyzerResult: React.FC<Props> = ({ outputs }) => {
  const data = [
    {
      name: 'Lifestyle',
      value: outputs.total_lifestyle_assets,
      color: netWorthColors.lifestyle,
    },
    {
      name: 'Income-generating',
      value: outputs.total_income_generating_assets,
      color: netWorthColors.income_generating,
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Net worth" value={formatCurrency(outputs.net_worth)} tone="primary" />
        <KpiCard
          label="Income-generating share"
          value={formatPercent(outputs.income_generating_pct_of_net_worth)}
          tone="secondary"
        />
        <KpiCard label="Total liabilities" value={formatCurrency(outputs.total_liabilities)} />
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset mix</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(d: { percent?: number }) =>
                    d.percent !== undefined ? `${Math.round(d.percent * 100)}%` : ''
                  }
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {outputs.interpretation && (
        <div className="bg-blue-50 ring-1 ring-blue-100 rounded-lg p-4 text-sm text-blue-900">
          {outputs.interpretation}
        </div>
      )}
    </div>
  );
};
