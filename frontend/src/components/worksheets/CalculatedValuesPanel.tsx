import React from 'react';
import type { WorksheetCalculatedValues } from '../../types/worksheet.types';
import { formatCurrency, formatPercent } from '../../utils/format';

interface Props {
  values: WorksheetCalculatedValues;
}

const looksMonetary = (key: string): boolean =>
  /(total|amount|balance|debt|net_worth|surplus|deficit|asset|liability|cover|income|expense)/i.test(
    key
  );

const looksPercent = (key: string): boolean => /(_pct|percent|pct)/i.test(key);

const renderValue = (key: string, value: unknown): string => {
  if (typeof value === 'number') {
    if (looksPercent(key)) return formatPercent(value);
    if (looksMonetary(key)) return formatCurrency(value);
    return String(value);
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (value === null || value === undefined) return '–';
  return JSON.stringify(value);
};

const humaniseKey = (key: string): string =>
  key
    .replace(/_pct$/, ' %')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Heuristic renderer for the bag-of-values calculated payload. The per-code
// subresult components handle the rich visuals; this is the "everything else"
// fallback used for APP-C/E/F or any worksheet without a dedicated subresult.
export const CalculatedValuesPanel: React.FC<Props> = ({ values }) => {
  if (!values) return null;
  const entries = Object.entries(values).filter(
    ([, v]) => v !== null && (typeof v !== 'object' || Array.isArray(v))
  );
  if (entries.length === 0) return null;

  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
      <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
        Calculated values
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-2 border-b border-attooh-border pb-1.5">
            <dt className="text-sm text-attooh-muted">{humaniseKey(key)}</dt>
            <dd className="text-sm font-bold text-attooh-charcoal text-right">
              {renderValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
