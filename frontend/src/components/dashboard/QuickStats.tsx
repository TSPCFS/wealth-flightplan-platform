import React from 'react';
import { Link } from 'react-router-dom';
import type { QuickStats as QuickStatsData } from '../../types/user.types';
import { formatCurrency, formatPercent } from '../../utils/format';

interface StatProps {
  label: string;
  value: number | null;
  format: 'currency' | 'percent';
  emptyHint: { text: string; to: string };
}

const StatCard: React.FC<StatProps> = ({ label, value, format, emptyHint }) => {
  const empty = value === null || value === undefined;
  return (
    <div
      data-testid={`quick-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-white rounded-lg shadow p-4"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {empty ? '–' : format === 'currency' ? formatCurrency(value) : formatPercent(value)}
      </p>
      {empty && (
        <Link
          to={emptyHint.to}
          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
        >
          {emptyHint.text}
        </Link>
      )}
    </div>
  );
};

interface Props {
  stats: QuickStatsData;
}

export const QuickStats: React.FC<Props> = ({ stats }) => (
  <section
    aria-label="Quick stats"
    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
  >
    <StatCard
      label="Net worth"
      value={stats.net_worth}
      format="currency"
      emptyHint={{ text: 'Complete Net Worth Statement', to: '/worksheets/APP-B' }}
    />
    <StatCard
      label="Monthly surplus"
      value={stats.monthly_surplus}
      format="currency"
      emptyHint={{ text: 'Complete Zero-Based Budget', to: '/worksheets/APP-A' }}
    />
    <StatCard
      label="Consumer debt"
      value={stats.total_consumer_debt}
      format="currency"
      emptyHint={{ text: 'Complete Debt Disclosure', to: '/worksheets/APP-D' }}
    />
    <StatCard
      label="Income-generating %"
      value={stats.income_generating_pct}
      format="percent"
      emptyHint={{ text: 'Complete Net Worth Statement', to: '/worksheets/APP-B' }}
    />
  </section>
);
