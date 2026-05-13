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

// attooh!-style "huge green number" stat treatment. Lato uppercase label
// on top, 32px Montserrat 700 lime number, optional supporting caption.
// Zero values render in charcoal to avoid a sea of green when the user
// has no consumer debt etc.
const StatCard: React.FC<StatProps> = ({ label, value, format, emptyHint }) => {
  const empty = value === null || value === undefined;
  const isZero = value === 0;
  return (
    <div
      data-testid={`quick-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-6 text-center"
    >
      <p className="font-lato font-bold text-[10px] uppercase tracking-[0.16em] text-attooh-slate mb-2">
        {label}
      </p>
      <p
        className={`font-montserrat font-bold text-[32px] leading-none mb-1 ${
          empty || isZero ? 'text-attooh-charcoal' : 'text-attooh-lime'
        }`}
      >
        {empty ? '–' : format === 'currency' ? formatCurrency(value) : formatPercent(value)}
      </p>
      {empty && (
        <Link
          to={emptyHint.to}
          className="text-[11px] text-attooh-slate underline hover:text-attooh-lime-hover mt-2 inline-block"
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
    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
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
