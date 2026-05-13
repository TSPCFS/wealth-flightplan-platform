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
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
        <p className="text-sm text-attooh-charcoal">{event.title}</p>
        <p className="text-xs text-attooh-muted">{relativeTimeFromIso(event.timestamp)}</p>
      </div>
      {event.event_type === 'stage_changed' && stageDir && (
        <span
          data-testid="stage-direction"
          className={`shrink-0 inline-flex items-center font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ring-1 ${
            stageDir === 'up'
              ? 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime'
              : stageDir === 'down'
                ? 'bg-[rgba(199,54,59,0.1)] text-attooh-danger ring-[rgba(199,54,59,0.25)]'
                : 'bg-attooh-bg text-attooh-slate ring-attooh-border'
          }`}
        >
          {stageDirectionSymbol(stageDir)}
        </span>
      )}
    </div>
  );

  return (
    <li className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm px-5 py-4">
      {event.link ? (
        <Link
          to={event.link}
          className="block hover:bg-attooh-lime-pale -mx-2 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
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
  useDocumentTitle('Activity');
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
    <AppLayout maxWidth="narrow" className="space-y-6">
      <header>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Activity
        </h1>
        <p className="text-attooh-muted mt-1.5">
          Every assessment, worksheet, and step you've completed, newest first.
        </p>
      </header>

      {error && <FormError error={error} />}

      {events.length === 0 ? (
        <div
          data-testid="activity-empty"
          className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 text-center space-y-3"
        >
          <p className="text-attooh-charcoal">Nothing here yet.</p>
          <p className="text-sm text-attooh-muted">
            Take an assessment to start the timeline.
          </p>
          <Link to="/assessments" className="inline-block">
            <Button type="button">Take an assessment</Button>
          </Link>
        </div>
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
    </AppLayout>
  );
};
