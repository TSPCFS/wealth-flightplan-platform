import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtAnalysisResult } from './DebtAnalysisResult';
import type { DebtAnalysisOutput } from '../../../types/content.types';

const outputs: DebtAnalysisOutput = {
  total_debt: 23000,
  weighted_average_rate_pct: 25.4,
  total_monthly_minimums: 1150,
  debt_free_months: 11,
  total_interest_paid: 2410.55,
  payment_order: [
    {
      name: 'Store Account',
      balance: 8000,
      annual_rate_pct: 28,
      expected_close_month: 5,
      reason: 'smallest balance first',
    },
    {
      name: 'Credit Card',
      balance: 15000,
      annual_rate_pct: 24,
      expected_close_month: 11,
      reason: 'rolled snowball into next',
    },
  ],
  monthly_projection: [
    { month: 1, total_balance: 21950, interest_charged: 510, accounts_remaining: 2 },
    { month: 5, total_balance: 14750, interest_charged: 320, accounts_remaining: 1 },
  ],
};

describe('DebtAnalysisResult', () => {
  it('renders headline KPI cards', () => {
    render(<DebtAnalysisResult outputs={outputs} />);
    expect(screen.getByText(/11\s*months/i)).toBeInTheDocument();
    expect(screen.getByText(/25\.4%/)).toBeInTheDocument();
    expect(screen.getByText(/R\s?2\s?411/)).toBeInTheDocument();
  });

  it('lists debts in payment order with reason text', () => {
    render(<DebtAnalysisResult outputs={outputs} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Store Account');
    expect(items[1]).toHaveTextContent('Credit Card');
    expect(screen.getByText(/smallest balance first/)).toBeInTheDocument();
  });
});
