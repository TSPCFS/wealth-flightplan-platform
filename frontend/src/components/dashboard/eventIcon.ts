import type { EventType } from '../../types/user.types';

interface EventVisual {
  symbol: string;
  tone: string;
  label: string;
}

// Single source of truth for activity event chrome (icon + colour) so the
// dashboard "Recent activity" card and the dedicated activity feed render the
// same indicators.
export const eventVisuals: Record<EventType, EventVisual> = {
  assessment_submitted: {
    symbol: '✓',
    tone: 'bg-blue-50 text-blue-700 ring-blue-200',
    label: 'Assessment',
  },
  worksheet_submitted: {
    symbol: '◧',
    tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    label: 'Worksheet',
  },
  step_completed: {
    symbol: '★',
    tone: 'bg-amber-50 text-amber-800 ring-amber-200',
    label: 'Step',
  },
  stage_changed: {
    symbol: '↑',
    tone: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    label: 'Stage change',
  },
};
