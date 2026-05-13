import React, { useEffect, useState } from 'react';
import { contentService } from '../services/content.service';
import type { FrameworkStep } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { StepCard } from '../components/framework/StepCard';
import { AppLayout } from '../components/common/AppLayout';

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
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!steps) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="wide">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">The Wealth FlightPlan™ framework</h1>
        <p className="text-gray-600">
          Seven steps from financial GPS to abundance. Open any step to dig in.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step) => (
          <StepCard key={step.step_number} step={step} />
        ))}
      </div>
    </AppLayout>
  );
};
