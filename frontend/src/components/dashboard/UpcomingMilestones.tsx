import React from 'react';
import { Link } from 'react-router-dom';
import type { MilestoneUpcoming } from '../../types/user.types';
import { formatShortDate } from '../../utils/relativeTime';
import { urgencyLabel, urgencyStyle } from './urgency';

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
    <section className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Upcoming milestones
        </h2>
        {showAllLink && (
          <Link
            to={showAllLink}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            See all
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-600">No upcoming milestones.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m.code} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                <p className="text-xs text-gray-500">{formatShortDate(m.due_date)}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${urgencyStyle[m.urgency]}`}
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
