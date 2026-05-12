import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GapsList } from './GapsList';
import type { GapIdentified } from '../../types/assessment.types';

const gaps: GapIdentified[] = [
  {
    question_code: 'q3',
    title: 'Monthly Money Conversation',
    current_status: 'no',
    priority: 'high',
    recommendation: 'Schedule a 30-minute Money Conversation this week.',
  },
  {
    question_code: 'q2',
    title: 'Monthly surplus accuracy',
    current_status: 'partially',
    priority: 'medium',
    recommendation: 'Tighten budget tracking.',
  },
];

describe('GapsList', () => {
  it('renders titles, status badges, and recommendation text', () => {
    render(<GapsList gaps={gaps} />);
    expect(screen.getByText('Monthly Money Conversation')).toBeInTheDocument();
    expect(screen.getByText('Monthly surplus accuracy')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText(/30-minute Money Conversation/)).toBeInTheDocument();
  });

  it('groups gaps with the high priority section appearing before medium', () => {
    render(<GapsList gaps={gaps} />);
    const high = screen.getByText('High priority');
    const medium = screen.getByText('Medium priority');
    // documentPosition flag 4 means high precedes medium in DOM order
    expect(high.compareDocumentPosition(medium) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a friendly empty state when no gaps', () => {
    render(<GapsList gaps={[]} />);
    expect(screen.getByText(/No gaps identified/i)).toBeInTheDocument();
  });
});
