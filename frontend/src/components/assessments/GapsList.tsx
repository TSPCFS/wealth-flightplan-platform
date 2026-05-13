import React from 'react';
import type { GapIdentified } from '../../types/assessment.types';

const PRIORITY_ORDER: GapIdentified['priority'][] = ['high', 'medium', 'low'];

const priorityRing: Record<GapIdentified['priority'], string> = {
  high: 'border-[rgba(199,54,59,0.25)]',
  medium: 'border-[rgba(232,169,58,0.35)]',
  low: 'border-attooh-border',
};

const statusLabel: Record<GapIdentified['current_status'], string> = {
  yes: 'In place',
  partially: 'Partial',
  no: 'Missing',
};

const statusStyle: Record<GapIdentified['current_status'], string> = {
  yes: 'bg-attooh-lime-pale text-attooh-success',
  partially: 'bg-[#FFF4DA] text-[#9C7611]',
  no: 'bg-[rgba(199,54,59,0.1)] text-attooh-danger',
};

interface GapsListProps {
  gaps: GapIdentified[];
}

export const GapsList: React.FC<GapsListProps> = ({ gaps }) => {
  if (gaps.length === 0) {
    return (
      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 text-center">
        <h2 className="font-montserrat text-lg font-bold text-attooh-charcoal mb-2">
          No gaps identified
        </h2>
        <p className="text-attooh-muted">
          Your plan covers every area we tested. Well done.
        </p>
      </section>
    );
  }

  // Group by priority so the most urgent items render first.
  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: gaps.filter((g) => g.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="space-y-7">
      {grouped.map((group) => (
        <div key={group.priority}>
          <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-3">
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
                className={`bg-attooh-card rounded-xl border-[1.5px] shadow-attooh-sm p-5 ${priorityRing[gap.priority]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-attooh-charcoal">{gap.title}</h3>
                  <span
                    className={`font-lato text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded ${statusStyle[gap.current_status]}`}
                  >
                    {statusLabel[gap.current_status]}
                  </span>
                </div>
                <p className="text-sm text-attooh-charcoal">{gap.recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
