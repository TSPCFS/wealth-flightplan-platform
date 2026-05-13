import React from 'react';

interface AssessmentProgressBarProps {
  current: number;
  total: number;
}

export const AssessmentProgressBar: React.FC<AssessmentProgressBarProps> = ({ current, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-attooh-muted mb-1.5">
        <span>
          Question {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Question ${current} of ${total}`}
        className="w-full bg-attooh-border rounded-full h-2 overflow-hidden"
      >
        <div
          className="bg-attooh-lime h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
