import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';
import type { ActivityEvent, ActivityResponse } from '../types/user.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { Button } from '../components/common/Button';
import { eventVisuals } from '../components/dashboard/eventIcon';
import { relativeTimeFromIso } from '../utils/relativeTime';
import { compareStages } from '../hooks/useDashboardStageCelebration';
import type { Stage } from '../types/assessment.types';

// Derive direction from the backend's stage_changed payload
// (`details.from_stage` + `details.to_stage`). Tolerates a legacy
// `details.direction` for forward-compat.
const stageDirectionFromDetails = (
  details?: Record<string, unknown>
): 'up' | 'down' | 'same' | null => {
  if (!details) return null;
  const legacy = details['direction'];
  if (legacy === 'up' || legacy === 'down' || legacy === 'same') return legacy;
  const from = details['from_stage'];
  const to = details['to_stage'];
  if (typeof from === 'string' && typeof to === 'string') {
    const dir = compareStages(to as Stage, from as Stage);
    if (dir === 'first') return null;
    return dir;
  }
  return null;
};

const stageDirectionSymbol = (dir: 'up' | 'down' | 'same'): string =>
  dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'Same';

interface EventRowProps {
  event: ActivityEvent;
}

const EventRow: React.FC<EventRowProps> = ({ event }) => {
  const visual = eventVisuals[event.event_type];
  const stageDir = stageDirectionFromDetails(event.details);
  const body = (
    <div className="flex items-start gap-3">
      <span
        className={`inline-flex items-center justify-center text-xs font-semibold w-7 h-7 rounded-full ring-1 ${visual.tone}`}
        aria-label={visual.label}
      >
        {visual.symbol}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{event.title}</p>
        <p className="text-xs text-gray-500">{relativeTimeFromIso(event.timestamp)}</p>
      </div>
      {event.event_type === 'stage_changed' && stageDir && (
        <span
          data-testid="stage-direction"
          className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${
            stageDir === 'up'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : stageDir === 'down'
                ? 'bg-red-50 text-red-700 ring-red-200'
                : 'bg-gray-50 text-gray-700 ring-gray-200'
          }`}
        >
          {stageDirectionSymbol(stageDir)}
        </span>
      )}
    </div>
  );

  return (
    <li className="bg-white rounded-lg shadow px-4 py-3">
      {event.link ? (
        <Link
          to={event.link}
          className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
};

const PAGE_SIZE = 20;

export const ActivityPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (res: ActivityResponse, append: boolean) => {
    setEvents((prev) => (append ? [...prev, ...res.events] : res.events));
    setCursor(res.next_cursor);
    setHasMore(res.has_more);
  };

  useEffect(() => {
    let cancelled = false;
    userService
      .getActivity(undefined, PAGE_SIZE)
      .then((res) => !cancelled && apply(res, false))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load activity.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await userService.getActivity(cursor, PAGE_SIZE);
      apply(res, true);
    } catch (err) {
      setError((err as Error).message || 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-600 mt-1">
          Every assessment, worksheet, and step you've completed, newest first.
        </p>
      </header>

      {error && <FormError error={error} />}

      {events.length === 0 ? (
        <p className="text-center text-gray-600 py-8">Nothing here yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event, idx) => (
            <EventRow key={`${event.timestamp}-${idx}`} event={event} />
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="text-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};
