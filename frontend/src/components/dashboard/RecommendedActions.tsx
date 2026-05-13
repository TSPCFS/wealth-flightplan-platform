import React from 'react';
import { Link } from 'react-router-dom';
import type {
  RecommendationPriority,
  RecommendedAction,
} from '../../types/user.types';
import { SectionLabel } from '../common/SectionLabel';

// Tones tuned for ≥4.5:1 contrast on the light tinted backgrounds.
// The lime palette is reserved for affordance/wins; warnings keep the
// attooh! warn-orange and danger-red brand tokens.
const priorityStyle: Record<RecommendationPriority, string> = {
  high: 'bg-[rgba(199,54,59,0.1)] text-attooh-danger',
  medium: 'bg-[rgba(232,169,58,0.15)] text-[#B07A12]',
  low: 'bg-[rgba(80,94,107,0.1)] text-attooh-slate',
};

const priorityLabel: Record<RecommendationPriority, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
};

interface Props {
  actions: RecommendedAction[];
  title?: string;
  capAt?: number;
  showAllLink?: string;
}

export const RecommendedActions: React.FC<Props> = ({
  actions,
  title = 'Recommended next steps',
  capAt,
  showAllLink,
}) => {
  const shown = capAt ? actions.slice(0, capAt) : actions;
  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <SectionLabel underline={false} className="min-w-0">
          {title}
        </SectionLabel>
        {showAllLink && (
          <Link
            to={showAllLink}
            className="shrink-0 font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            See all →
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-attooh-muted">
          Nothing pressing. Keep working through the framework.
        </p>
      ) : (
        <ul className="divide-y divide-attooh-border">
          {shown.map((action, idx) => (
            <li key={`${action.action_url}-${idx}`} className="py-4 first:pt-0 last:pb-0">
              <Link
                to={action.action_url}
                className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime rounded"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${priorityStyle[action.priority]}`}
                  >
                    <span aria-hidden="true">●</span>
                    {priorityLabel[action.priority]}
                  </span>
                  <span aria-hidden="true" className="text-attooh-lime-hover group-hover:translate-x-0.5 transition">
                    →
                  </span>
                </div>
                <p className="text-base font-bold text-attooh-charcoal group-hover:text-attooh-lime-hover">
                  {action.title}
                </p>
                <p className="text-[13px] text-attooh-muted mt-1.5">{action.reason}</p>
                {action.estimated_time_minutes !== undefined && (
                  <p className="font-lato text-[11px] text-attooh-muted uppercase tracking-wider mt-2">
                    ~ {action.estimated_time_minutes} minutes
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
