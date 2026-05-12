import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryTimeline } from './HistoryTimeline';
import type { StageProgressionEntry } from '../../types/assessment.types';

const progression: StageProgressionEntry[] = [
  { stage: 'Momentum', score: 18, date: '2026-03-20T08:00:00Z' },
  { stage: 'Foundation', score: 12, date: '2026-01-15T08:00:00Z' },
  { stage: 'Freedom', score: 28, date: '2026-05-12T10:30:00Z' },
];

describe('HistoryTimeline', () => {
  it('shows a friendly empty-state when no progression', () => {
    render(<HistoryTimeline progression={[]} />);
    expect(screen.getByText(/start building your progression timeline/i)).toBeInTheDocument();
  });

  it('renders stages in oldest-first order even if input is shuffled', () => {
    render(<HistoryTimeline progression={progression} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Foundation');
    expect(items[1]).toHaveTextContent('Momentum');
    expect(items[2]).toHaveTextContent('Freedom');
  });

  it('renders score for each entry', () => {
    render(<HistoryTimeline progression={progression} />);
    expect(screen.getByText('Score: 12')).toBeInTheDocument();
    expect(screen.getByText('Score: 18')).toBeInTheDocument();
    expect(screen.getByText('Score: 28')).toBeInTheDocument();
  });
});
