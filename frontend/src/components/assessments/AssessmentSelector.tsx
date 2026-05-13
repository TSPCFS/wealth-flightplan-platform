import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../common/AppLayout';

interface SelectorCard {
  to: string;
  title: string;
  time: string;
  description: string;
}

const CARDS: SelectorCard[] = [
  {
    to: '/assessments/5q',
    title: '5-Question Quick Check',
    time: '~2 minutes',
    description:
      'A fast placement on your current stage. Best if you want a quick read on where you stand.',
  },
  {
    to: '/assessments/10q',
    title: '10-Question Full Assessment',
    time: '~5 minutes',
    description:
      'A deeper placement covering will, TFSA, retirement, insurance and net worth tracking.',
  },
  {
    to: '/assessments/gap',
    title: 'GAP Test™',
    time: '~6 minutes',
    description:
      'Twelve targeted yes / partially / no questions that surface the specific gaps in your plan.',
  },
];

export const AssessmentSelector: React.FC = () => {
  return (
    <AppLayout maxWidth="wide">
      <header className="mb-9">
        <h1 className="font-montserrat text-3xl sm:text-[36px] font-bold text-attooh-charcoal tracking-tight mb-1.5">
          Choose an assessment
        </h1>
        <p className="text-base text-attooh-muted">
          Pick the format that fits your time. Your previous results stay on your dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group block bg-attooh-card rounded-xl border border-attooh-border p-7 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
          >
            <div className="font-lato text-[11px] font-bold uppercase tracking-[0.16em] text-attooh-lime-hover mb-3">
              {card.time}
            </div>
            <h2 className="text-xl font-bold text-attooh-charcoal mb-2">{card.title}</h2>
            <p className="text-sm text-attooh-muted mb-5">{card.description}</p>
            <span className="font-lato font-bold text-[13px] uppercase tracking-[0.08em] text-attooh-lime-hover inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Start →
            </span>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
};
