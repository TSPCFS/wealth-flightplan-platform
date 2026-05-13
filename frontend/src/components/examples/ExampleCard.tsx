import React from 'react';
import { Link } from 'react-router-dom';
import type { ExampleSummary } from '../../types/content.types';

interface ExampleCardProps {
  example: ExampleSummary;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ example }) => (
  <Link
    to={`/examples/${encodeURIComponent(example.example_code)}`}
    className="group block bg-attooh-card rounded-xl border border-attooh-border p-6 shadow-attooh-sm transition-all duration-200 hover:border-attooh-lime hover:shadow-attooh-md hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="font-lato text-[11px] font-bold uppercase tracking-[0.16em] text-attooh-lime-hover">
        {example.example_code}
      </span>
      {example.calculator_type && (
        <span className="inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] bg-attooh-lime-pale text-attooh-success px-2.5 py-1 rounded-full">
          Has calculator
        </span>
      )}
    </div>
    <h3 className="text-base font-bold text-attooh-charcoal mb-1">{example.title}</h3>
    <p className="text-xs text-attooh-muted mb-3 italic">{example.chapter}</p>
    <p className="text-sm text-attooh-charcoal mb-4 line-clamp-3">{example.key_principle}</p>
    {example.stage_relevance.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {example.stage_relevance.map((s) => (
          <span
            key={s}
            className="font-lato text-[10px] font-bold uppercase tracking-[0.1em] bg-attooh-bg text-attooh-slate px-2 py-1 rounded"
          >
            {s}
          </span>
        ))}
      </div>
    )}
  </Link>
);
