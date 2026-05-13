import type { MilestoneUrgency } from '../../types/user.types';

// Bumped one Tailwind step darker on red/amber for ≥4.5:1 contrast against
// the light tinted backgrounds (WCAG AA).
export const urgencyStyle: Record<MilestoneUrgency, string> = {
  overdue: 'bg-red-50 text-red-800 ring-red-200',
  soon: 'bg-amber-50 text-amber-900 ring-amber-200',
  upcoming: 'bg-gray-50 text-gray-800 ring-gray-200',
};

export const urgencyLabel: Record<MilestoneUrgency, string> = {
  overdue: 'Overdue',
  soon: 'Soon',
  upcoming: 'Upcoming',
};
