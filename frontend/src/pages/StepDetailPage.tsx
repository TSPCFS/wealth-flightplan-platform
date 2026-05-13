import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { contentService } from '../services/content.service';
import type { StepDetail, StepNumber } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { SectionLabel } from '../components/common/SectionLabel';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const VALID_STEPS: StepNumber[] = ['1', '2', '3', '4a', '4b', '5', '6'];

const isStepNumber = (v: string | undefined): v is StepNumber =>
  Boolean(v) && (VALID_STEPS as string[]).includes(v as string);

export const StepDetailPage: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const [step, setStep] = useState<StepDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(step ? `Step ${step.step_number} · ${step.title}` : null);

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
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link
            to="/framework"
            className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Back to framework
          </Link>
        </div>
      </AppLayout>
    );
  }
  if (!step) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <Link
          to="/framework"
          className="inline-flex items-center font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal mb-3"
        >
          ← Framework
        </Link>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-attooh-lime text-attooh-charcoal font-montserrat font-bold text-base ring-[3px] ring-attooh-lime-pale flex-shrink-0"
          >
            {step.step_number}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
            {step.title}
          </h1>
        </div>
        <p className="text-lg text-attooh-muted mt-2 italic">{step.subtitle}</p>
      </header>

      <section>
        <p className="text-attooh-charcoal">{step.description}</p>
      </section>

      {step.key_metrics.length > 0 && (
        <section>
          <SectionLabel>Key metrics</SectionLabel>
          <ul className="flex flex-wrap gap-2 mt-3">
            {step.key_metrics.map((m) => (
              <li
                key={m}
                className="font-lato text-xs font-bold uppercase tracking-wider bg-attooh-lime-pale text-attooh-success px-3 py-1.5 rounded"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.body_markdown && (
        <section data-testid="step-body" className="prose max-w-none prose-headings:font-montserrat prose-headings:text-attooh-charcoal prose-p:text-attooh-charcoal">
          <ReactMarkdown>{step.body_markdown}</ReactMarkdown>
        </section>
      )}

      {step.related_example_codes.length > 0 && (
        <section>
          <SectionLabel>Related worked examples</SectionLabel>
          <ul className="flex flex-wrap gap-2 mt-3">
            {step.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-attooh-success bg-attooh-lime-pale px-3 py-1 rounded-full hover:bg-attooh-lime hover:text-attooh-charcoal transition-colors"
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
          <SectionLabel>Related worksheets</SectionLabel>
          <ul className="flex flex-wrap gap-2 mt-3">
            {step.related_worksheet_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/worksheets/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-attooh-success bg-attooh-lime-pale hover:bg-attooh-lime hover:text-attooh-charcoal px-3 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
                >
                  {code} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
};
