import type { MilestoneUrgency } from '../../types/user.types';

export const urgencyStyle: Record<MilestoneUrgency, string> = {
  overdue: 'bg-red-50 text-red-700 ring-red-200',
  soon: 'bg-amber-50 text-amber-800 ring-amber-200',
  upcoming: 'bg-gray-50 text-gray-700 ring-gray-200',
};

export const urgencyLabel: Record<MilestoneUrgency, string> = {
  overdue: 'Overdue',
  soon: 'Soon',
  upcoming: 'Upcoming',
};
