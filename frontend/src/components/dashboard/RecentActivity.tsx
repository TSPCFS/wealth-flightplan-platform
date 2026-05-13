import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityEvent } from '../../types/user.types';
import { eventVisuals } from './eventIcon';
import { relativeTimeFromIso } from '../../utils/relativeTime';
import { SectionLabel } from '../common/SectionLabel';

interface Props {
  events: ActivityEvent[];
  capAt?: number;
  showAllLink?: string;
}

export const RecentActivity: React.FC<Props> = ({
  events,
  capAt,
  showAllLink = '/activity',
}) => {
  const shown = capAt ? events.slice(0, capAt) : events;
  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <SectionLabel underline={false}>Recent activity</SectionLabel>
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
          Nothing here yet. Finish an assessment or worksheet to start the timeline.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((event, idx) => {
            const visual = eventVisuals[event.event_type];
            const inner = (
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold w-7 h-7 rounded-full ring-1 ${visual.tone}`}
                  aria-label={visual.label}
                >
                  {visual.symbol}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-attooh-charcoal break-words">{event.title}</p>
                  <p className="text-xs text-attooh-muted">
                    {relativeTimeFromIso(event.timestamp)}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={`${event.timestamp}-${idx}`}>
                {event.link ? (
                  <Link
                    to={event.link}
                    className="block hover:bg-attooh-lime-pale -mx-2 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
