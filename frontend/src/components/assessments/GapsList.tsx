import React from 'react';
import type { GapIdentified } from '../../types/assessment.types';

const PRIORITY_ORDER: GapIdentified['priority'][] = ['high', 'medium', 'low'];

const priorityStyle: Record<GapIdentified['priority'], string> = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  low: 'bg-blue-50 text-blue-700 ring-blue-200',
};

const statusLabel: Record<GapIdentified['current_status'], string> = {
  yes: 'In place',
  partially: 'Partial',
  no: 'Missing',
};

const statusStyle: Record<GapIdentified['current_status'], string> = {
  yes: 'bg-green-50 text-green-700',
  partially: 'bg-yellow-50 text-yellow-800',
  no: 'bg-red-50 text-red-700',
};

interface GapsListProps {
  gaps: GapIdentified[];
}

export const GapsList: React.FC<GapsListProps> = ({ gaps }) => {
  if (gaps.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No gaps identified</h2>
        <p className="text-gray-600">Your plan covers every area we tested. Well done.</p>
      </section>
    );
  }

  // Group by priority so the most urgent items render first.
  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: gaps.filter((g) => g.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="space-y-6">
      {grouped.map((group) => (
        <div key={group.priority}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {group.priority === 'high'
              ? 'High priority'
              : group.priority === 'medium'
                ? 'Medium priority'
                : 'Other items to consider'}
          </h2>
          <ul className="space-y-3">
            {group.items.map((gap) => (
              <li
                key={gap.question_code}
                className={`bg-white rounded-lg shadow p-5 ring-1 ${priorityStyle[gap.priority]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{gap.title}</h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle[gap.current_status]}`}
                  >
                    {statusLabel[gap.current_status]}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{gap.recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
