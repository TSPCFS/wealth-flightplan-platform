import type { EventType } from '../../types/user.types';

interface EventVisual {
  symbol: string;
  tone: string;
  label: string;
}

// Single source of truth for activity event chrome (icon + colour) so the
// dashboard "Recent activity" card and the dedicated activity feed render the
// same indicators. Tones map onto the attooh! palette so the iconography
// rhymes with the cards around it.
export const eventVisuals: Record<EventType, EventVisual> = {
  assessment_submitted: {
    symbol: '✓',
    tone: 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime',
    label: 'Assessment',
  },
  worksheet_submitted: {
    symbol: '◧',
    tone: 'bg-attooh-bg text-attooh-slate ring-attooh-border',
    label: 'Worksheet',
  },
  step_completed: {
    symbol: '★',
    tone: 'bg-[#FFF4DA] text-[#9C7611] ring-[#F4D790]',
    label: 'Step',
  },
  stage_changed: {
    symbol: '↑',
    tone: 'bg-attooh-lime-pale text-attooh-success ring-attooh-lime',
    label: 'Stage change',
  },
};
