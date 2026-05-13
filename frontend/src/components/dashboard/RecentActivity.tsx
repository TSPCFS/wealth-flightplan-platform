import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityEvent } from '../../types/user.types';
import { eventVisuals } from './eventIcon';
import { relativeTimeFromIso } from '../../utils/relativeTime';

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
    <section className="bg-white rounded-lg shadow p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 min-w-0">
          Recent activity
        </h2>
        {showAllLink && (
          <Link
            to={showAllLink}
            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            See all →
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-900 break-words">{event.title}</p>
                  <p className="text-xs text-gray-500">
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
                    className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
