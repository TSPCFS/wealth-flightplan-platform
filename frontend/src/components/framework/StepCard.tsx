import React from 'react';
import { Link } from 'react-router-dom';
import type { FrameworkStep } from '../../types/content.types';

interface StepCardProps {
  step: Pick<FrameworkStep, 'step_number' | 'title' | 'subtitle' | 'time_estimate_minutes'>;
}

// attooh!-branded step card. Lime number circle with a 3px lime-pale ring,
// Lato uppercase time pill, lifts on hover with a lime border + softer
// shadow. Subtitle in italic muted-grey matches MOCKUP.html.
export const StepCard: React.FC<StepCardProps> = ({ step }) => (
  <Link
    to={`/framework/${encodeURIComponent(step.step_number)}`}
    className="group block bg-attooh-card rounded-xl border border-attooh-border p-7 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
  >
    <div className="flex items-center justify-between mb-4">
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-attooh-lime text-attooh-charcoal font-montserrat font-bold text-base ring-[3px] ring-attooh-lime-pale"
      >
        {step.step_number}
      </span>
      <span className="font-lato text-[11px] uppercase tracking-[0.1em] text-attooh-muted">
        ~{step.time_estimate_minutes} min
      </span>
    </div>
    <h2 className="text-[19px] font-bold text-attooh-charcoal mb-1.5">{step.title}</h2>
    <p className="text-[13px] text-attooh-muted italic mb-5">{step.subtitle}</p>
    <span className="font-lato font-bold text-[13px] uppercase tracking-[0.08em] text-attooh-lime-hover inline-flex items-center gap-1 group-hover:gap-2 transition-all">
      Open →
    </span>
  </Link>
);
