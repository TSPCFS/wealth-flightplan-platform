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
      ? 'text-green-700 bg-green-50'
      : delta.direction === 'down'
        ? 'text-red-700 bg-red-50'
        : 'text-gray-700 bg-gray-100';

  return (
    <section className="bg-white rounded-lg shadow p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Your current stage
        </h2>
        <span
          data-testid="stage-delta"
          className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded ${deltaColor}`}
        >
          <span aria-hidden="true" className="mr-1">
            {delta.symbol}
          </span>
          {delta.label}
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 break-words">{calculatedStage}</h1>
      <p className="text-gray-700 mb-4">{stageDetails.description}</p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Income runway</dt>
          <dd className="text-gray-900 font-medium">{stageDetails.income_runway}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Total score</dt>
          <dd className="text-gray-900 font-medium">{totalScore}</dd>
        </div>
      </dl>
    </section>
  );
};
