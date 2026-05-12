import React from 'react';
import { Link } from 'react-router-dom';
import type {
  RecommendationPriority,
  RecommendedAction,
} from '../../types/user.types';

const priorityStyle: Record<RecommendationPriority, string> = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-blue-50 text-blue-700 ring-blue-200',
};

interface Props {
  actions: RecommendedAction[];
  title?: string;
  capAt?: number;
  showAllLink?: string;
}

export const RecommendedActions: React.FC<Props> = ({
  actions,
  title = 'Recommended next steps',
  capAt,
  showAllLink,
}) => {
  const shown = capAt ? actions.slice(0, capAt) : actions;
  return (
    <section className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
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
        <p className="text-sm text-gray-600">
          Nothing pressing — keep working through the framework.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((action, idx) => (
            <li key={`${action.action_url}-${idx}`} className="py-3">
              <Link
                to={action.action_url}
                className="block group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ring-1 ${priorityStyle[action.priority]}`}
                  >
                    {action.priority}
                  </span>
                  <span aria-hidden="true" className="text-blue-600 group-hover:translate-x-0.5 transition">
                    →
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                  {action.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{action.reason}</p>
                {action.estimated_time_minutes !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">
                    ~{action.estimated_time_minutes} min
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
