import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { contentService } from '../services/content.service';
import type { StepDetail, StepNumber } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';

const VALID_STEPS: StepNumber[] = ['1', '2', '3', '4a', '4b', '5', '6'];

const isStepNumber = (v: string | undefined): v is StepNumber =>
  Boolean(v) && (VALID_STEPS as string[]).includes(v as string);

export const StepDetailPage: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const [step, setStep] = useState<StepDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStepNumber(stepNumber)) {
      setError('Unknown step number');
      return;
    }
    let cancelled = false;
    contentService
      .getStep(stepNumber)
      .then((res) => !cancelled && setStep(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load step.'));
    return () => {
      cancelled = true;
    };
  }, [stepNumber]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link to="/framework" className="text-blue-600 underline">
            Back to framework
          </Link>
        </div>
      </div>
    );
  }
  if (!step) return <LoadingSpinner />;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header>
        <Link to="/framework" className="text-sm text-blue-600 underline">
          ← Framework
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="inline-flex items-center justify-center text-sm font-semibold text-white bg-blue-600 rounded-full w-8 h-8">
            {step.step_number}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{step.title}</h1>
        </div>
        <p className="text-lg text-gray-600 mt-1">{step.subtitle}</p>
      </header>

      <section>
        <p className="text-gray-800">{step.description}</p>
      </section>

      {step.key_metrics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Key metrics
          </h2>
          <ul className="flex flex-wrap gap-2">
            {step.key_metrics.map((m) => (
              <li
                key={m}
                className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.body_markdown && (
        <section data-testid="step-body" className="prose prose-blue max-w-none">
          <ReactMarkdown>{step.body_markdown}</ReactMarkdown>
        </section>
      )}

      {step.related_example_codes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Related worked examples
          </h2>
          <ul className="flex flex-wrap gap-2">
            {step.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
                >
                  {code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.related_worksheet_codes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Related worksheets
          </h2>
          <ul className="flex flex-wrap gap-2">
            {step.related_worksheet_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/worksheets/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-blue-700 bg-blue-50 ring-1 ring-blue-100 hover:bg-blue-100 px-3 py-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {code} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
};
