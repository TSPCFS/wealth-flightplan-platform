import React from 'react';
import { Link } from 'react-router-dom';
import type { MilestoneUpcoming } from '../../types/user.types';
import { formatShortDate } from '../../utils/relativeTime';
import { urgencyLabel, urgencyStyle } from './urgency';
import { SectionLabel } from '../common/SectionLabel';

interface Props {
  milestones: MilestoneUpcoming[];
  capAt?: number;
  showAllLink?: string;
}

export const UpcomingMilestones: React.FC<Props> = ({
  milestones,
  capAt,
  showAllLink = '/milestones',
}) => {
  const shown = capAt ? milestones.slice(0, capAt) : milestones;
  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <SectionLabel underline={false}>Upcoming milestones</SectionLabel>
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
        <p className="text-sm text-attooh-muted">No upcoming milestones.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m.code} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-attooh-charcoal break-words">{m.title}</p>
                <p className="text-xs text-attooh-muted">{formatShortDate(m.due_date)}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded ring-1 ${urgencyStyle[m.urgency]}`}
              >
                {urgencyLabel[m.urgency]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
