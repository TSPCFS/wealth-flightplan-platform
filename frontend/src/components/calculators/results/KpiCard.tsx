import React from 'react';

type Tone = 'primary' | 'secondary' | 'warn' | 'danger' | 'neutral';

const toneStyle: Record<Tone, string> = {
  primary: 'bg-blue-50 text-blue-900 ring-blue-100',
  secondary: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
  warn: 'bg-amber-50 text-amber-900 ring-amber-100',
  danger: 'bg-red-50 text-red-900 ring-red-100',
  neutral: 'bg-gray-50 text-gray-900 ring-gray-100',
};

interface KpiCardProps {
  label: string;
  value: string;
  tone?: Tone;
  sublabel?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, tone = 'neutral', sublabel }) => (
  <div className={`rounded-lg p-4 ring-1 ${toneStyle[tone]}`}>
    <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {sublabel && <p className="text-xs opacity-70 mt-1">{sublabel}</p>}
  </div>
);
