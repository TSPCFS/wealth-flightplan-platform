import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetAllocatorResult } from './BudgetAllocatorResult';
import type { BudgetAllocatorOutput } from '../../../types/content.types';

const balanced: BudgetAllocatorOutput = {
  total_income: 45000,
  total_allocated: 45000,
  surplus_deficit: 0,
  needs_pct: 71.1,
  wants_pct: 7.8,
  invest_pct: 21.1,
  status: 'balanced',
  feedback: 'Needs are 21 pts above target.',
  target_comparison: [
    { category: 'needs', actual_pct: 71.1, target_pct: 50, status: 'high' },
    { category: 'wants', actual_pct: 7.8, target_pct: 30, status: 'low' },
    { category: 'invest', actual_pct: 21.1, target_pct: 20, status: 'on_track' },
  ],
};

describe('BudgetAllocatorResult', () => {
  it('renders surplus/deficit KPI with the feedback text', () => {
    render(<BudgetAllocatorResult outputs={balanced} />);
    expect(screen.getByText('Surplus / deficit')).toBeInTheDocument();
    expect(screen.getByText('Income matches allocation')).toBeInTheDocument();
    expect(screen.getByText('Needs are 21 pts above target.')).toBeInTheDocument();
  });

  it('shows a deficit tone when status is deficit', () => {
    render(
      <BudgetAllocatorResult
        outputs={{ ...balanced, status: 'deficit', surplus_deficit: -2000 }}
      />
    );
    expect(screen.getByText('You are over budget')).toBeInTheDocument();
  });
});
