import React, { useEffect, useState } from 'react';
import { contentService } from '../services/content.service';
import type { FrameworkStep } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { StepCard } from '../components/framework/StepCard';

export const FrameworkOverviewPage: React.FC = () => {
  const [steps, setSteps] = useState<FrameworkStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    contentService
      .getFramework()
      .then((res) => !cancelled && setSteps(res.steps))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load framework.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={error} />
      </div>
    );
  }
  if (!steps) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">The WealthFlightPlan™ framework</h1>
        <p className="text-gray-600">
          Seven steps from financial GPS to abundance. Open any step to dig in.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step) => (
          <StepCard key={step.step_number} step={step} />
        ))}
      </div>
    </div>
  );
};
