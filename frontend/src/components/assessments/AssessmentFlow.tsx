import React, { useState } from 'react';
import type { AssessmentQuestion } from '../../data/assessment-questions';
import type { AssessmentType } from '../../types/assessment.types';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { useAssessmentDraft } from '../../hooks/useAssessmentDraft';
import { AssessmentProgressBar } from './AssessmentProgressBar';
import { QuestionCard } from './QuestionCard';

export interface AssessmentFlowProps {
  type: AssessmentType;
  questions: AssessmentQuestion[];
  title: string;
  onSubmit: (
    responses: Record<string, string>,
    completionTimeSeconds: number
  ) => Promise<void>;
}

export const AssessmentFlow: React.FC<AssessmentFlowProps> = ({
  type,
  questions,
  title,
  onSubmit,
}) => {
  const draft = useAssessmentDraft(type);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Clamp restored index to a valid bound — the catalogue might shrink between visits.
  const safeIndex = Math.max(0, Math.min(draft.index, questions.length - 1));
  const currentQ = questions[safeIndex];
  const currentValue = draft.responses[currentQ.code] ?? null;
  const isLast = safeIndex === questions.length - 1;
  const allAnswered = questions.every((q) => Boolean(draft.responses[q.code]));

  const handleChange = (value: string) => {
    draft.setResponse(currentQ.code, value);
  };

  const handleNext = () => {
    if (!currentValue) return;
    if (safeIndex < questions.length - 1) {
      draft.setIndex(safeIndex + 1);
    }
  };

  const handleBack = () => {
    if (safeIndex > 0) draft.setIndex(safeIndex - 1);
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    const elapsed = Math.max(0, Math.round((Date.now() - draft.startedAt) / 1000));
    try {
      await onSubmit(draft.responses, elapsed);
      draft.clear();
    } catch (error) {
      const apiErr = error as { code?: string; details?: Record<string, string[]>; message?: string };
      if (apiErr?.code === 'VALIDATION_ERROR' && apiErr.details) {
        setFieldErrors(apiErr.details);
        // Jump to the first offending question so the user can fix it.
        const firstBad = questions.findIndex((q) => apiErr.details && apiErr.details[q.code]);
        if (firstBad >= 0) draft.setIndex(firstBad);
        setSubmitError('Some answers need review.');
      } else {
        setSubmitError(apiErr?.message ?? 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <AssessmentProgressBar current={safeIndex + 1} total={questions.length} />
      </header>

      <FormError error={submitError || undefined} />

      <QuestionCard
        question={currentQ}
        value={currentValue}
        onChange={handleChange}
        questionNumber={safeIndex + 1}
        total={questions.length}
      />

      {fieldErrors[currentQ.code]?.length ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {fieldErrors[currentQ.code].join(' ')}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 justify-between mt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          disabled={safeIndex === 0 || submitting}
        >
          Back
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            aria-label="Submit assessment"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!currentValue || submitting}
          >
            Next
          </Button>
        )}
      </div>

      {Object.keys(fieldErrors).length > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            onClick={() => {
              const firstBad = questions.findIndex((q) => fieldErrors[q.code]);
              if (firstBad >= 0) draft.setIndex(firstBad);
            }}
          >
            Review answers
          </button>
        </div>
      )}
    </div>
  );
};
