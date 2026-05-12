import React from 'react';
import { Link } from 'react-router-dom';
import type { FrameworkStep } from '../../types/content.types';

interface StepCardProps {
  step: Pick<FrameworkStep, 'step_number' | 'title' | 'subtitle' | 'time_estimate_minutes'>;
}

export const StepCard: React.FC<StepCardProps> = ({ step }) => (
  <Link
    to={`/framework/${encodeURIComponent(step.step_number)}`}
    className="block bg-white rounded-lg shadow border border-transparent p-6 hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="inline-flex items-center justify-center text-sm font-semibold text-white bg-blue-600 rounded-full w-8 h-8">
        {step.step_number}
      </span>
      <span className="text-xs text-gray-500">~{step.time_estimate_minutes} min</span>
    </div>
    <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
    <p className="text-sm text-gray-600 mt-1 mb-3">{step.subtitle}</p>
    <span className="inline-flex items-center text-sm font-medium text-blue-600">
      Open →
    </span>
  </Link>
);
