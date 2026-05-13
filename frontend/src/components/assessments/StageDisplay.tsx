import React from 'react';
import type { Stage, StageDetails } from '../../types/assessment.types';

const STAGE_ORDER: Stage[] = ['Foundation', 'Momentum', 'Freedom', 'Independence', 'Abundance'];

const stageDelta = (
  current: Stage,
  previous: Stage | null
): { direction: 'up' | 'down' | 'same' | 'first'; label: string; symbol: string } => {
  if (!previous) return { direction: 'first', label: 'First placement', symbol: '✨' };
  const ci = STAGE_ORDER.indexOf(current);
  const pi = STAGE_ORDER.indexOf(previous);
  if (ci > pi) return { direction: 'up', label: `Up from ${previous}`, symbol: '↑' };
  if (ci < pi) return { direction: 'down', label: `Down from ${previous}`, symbol: '↓' };
  return { direction: 'same', label: `Held at ${previous}`, symbol: '→' };
};

interface StageDisplayProps {
  calculatedStage: Stage;
  previousStage: Stage | null;
  stageDetails: StageDetails;
  totalScore: number;
}

export const StageDisplay: React.FC<StageDisplayProps> = ({
  calculatedStage,
  previousStage,
  stageDetails,
  totalScore,
}) => {
  const delta = stageDelta(calculatedStage, previousStage);

  const deltaColor =
    delta.direction === 'up'
      ? 'text-attooh-success bg-attooh-lime-pale'
      : delta.direction === 'down'
        ? 'text-attooh-danger bg-[rgba(199,54,59,0.1)]'
        : 'text-attooh-slate bg-attooh-bg';

  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 sm:p-9">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate">
          Your current stage
        </h2>
        <span
          data-testid="stage-delta"
          className={`inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ${deltaColor}`}
        >
          <span aria-hidden="true" className="mr-1">
            {delta.symbol}
          </span>
          {delta.label}
        </span>
      </div>

      <h1 className="font-montserrat text-3xl sm:text-4xl font-bold text-attooh-charcoal mb-3 break-words tracking-tight">
        {calculatedStage}
      </h1>
      <p className="text-attooh-charcoal mb-5">{stageDetails.description}</p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-lato text-[10px] font-bold uppercase tracking-[0.14em] text-attooh-muted">
            Income runway
          </dt>
          <dd className="text-attooh-charcoal font-medium mt-0.5">{stageDetails.income_runway}</dd>
        </div>
        <div>
          <dt className="font-lato text-[10px] font-bold uppercase tracking-[0.14em] text-attooh-muted">
            Total score
          </dt>
          <dd className="text-attooh-charcoal font-medium mt-0.5">{totalScore}</dd>
        </div>
      </dl>
    </section>
  );
};
