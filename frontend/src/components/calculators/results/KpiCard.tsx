import React from 'react';

type Tone = 'primary' | 'secondary' | 'warn' | 'danger' | 'neutral';

// Featured = the attooh!-branded "hero result" treatment: lime-pale to
// white gradient with a 4px lime accent strip down the left. Use it on
// the single value that's the headline of the calculation (e.g.
// "Monthly passive income" for compound interest, "Debt-free in" for
// the debt analyser). Non-featured cards use a quieter neutral tone so
// the contrast does the storytelling.
const toneStyle: Record<Tone, string> = {
  primary: 'text-attooh-charcoal',
  secondary: 'text-attooh-success',
  warn: 'text-[#B07A12]',
  danger: 'text-attooh-danger',
  neutral: 'text-attooh-charcoal',
};

interface KpiCardProps {
  label: string;
  value: string;
  tone?: Tone;
  sublabel?: string;
  featured?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  tone = 'neutral',
  sublabel,
  featured = false,
}) => (
  <div
    className={[
      'relative rounded-xl border p-6 shadow-attooh-sm overflow-hidden',
      featured
        ? 'bg-gradient-to-br from-attooh-lime-pale to-white border-attooh-lime'
        : 'bg-attooh-card border-attooh-border',
    ].join(' ')}
  >
    {featured && (
      <span
        aria-hidden="true"
        className="absolute left-0 top-3 bottom-3 w-1 bg-attooh-lime rounded-r"
      />
    )}
    <p className="font-lato font-bold text-[10px] uppercase tracking-[0.16em] text-attooh-slate mb-1.5">
      {label}
    </p>
    <p
      className={`font-montserrat font-bold text-[28px] leading-none ${
        featured ? 'text-attooh-lime-hover' : toneStyle[tone]
      }`}
    >
      {value}
    </p>
    {sublabel && <p className="text-xs text-attooh-muted mt-1.5">{sublabel}</p>}
  </div>
);
