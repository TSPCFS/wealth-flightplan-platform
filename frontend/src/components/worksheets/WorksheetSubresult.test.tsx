import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorksheetSubresult } from './WorksheetSubresult';

describe('WorksheetSubresult', () => {
  it('renders BudgetAllocatorResult for APP-A', () => {
    render(
      <WorksheetSubresult
        worksheetCode="APP-A"
        values={{
          total_income: 45000,
          total_needs: 32000,
          total_wants: 3500,
          total_invest: 9500,
          surplus_deficit: 0,
          needs_pct: 71.1,
          wants_pct: 7.8,
          invest_pct: 21.1,
          status: 'balanced',
        }}
      />
    );
    expect(screen.getByText('Surplus / deficit')).toBeInTheDocument();
    expect(screen.getByText('Income matches allocation')).toBeInTheDocument();
  });

  it('renders NetWorthAnalyzerResult for APP-B', () => {
    render(
      <WorksheetSubresult
        worksheetCode="APP-B"
        values={{
          total_lifestyle_assets: 4500000,
          total_income_generating_assets: 1200000,
          total_assets: 5700000,
          total_liabilities: 3100000,
          net_worth: 2600000,
          income_generating_pct_of_net_worth: 46.2,
          interpretation: '46% of your net worth is income-generating.',
        }}
      />
    );
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    expect(screen.getByText(/46% of your net worth/)).toBeInTheDocument();
  });

  it('renders DebtAnalysisResult for APP-D', () => {
    render(
      <WorksheetSubresult
        worksheetCode="APP-D"
        values={{
          total_debt: 23000,
          weighted_average_rate_pct: 25.4,
          total_monthly_minimums: 1150,
          debt_free_months: 11,
          total_interest_paid: 2410.55,
          payment_order: [],
          monthly_projection: [],
        }}
      />
    );
    expect(screen.getByText('Debt-free in')).toBeInTheDocument();
  });

  it('falls back to a generic calculated-values panel for other codes', () => {
    render(
      <WorksheetSubresult
        worksheetCode="APP-C"
        values={{ documents_complete: 6, total_required: 10 }}
      />
    );
    expect(screen.getByText('Calculated values')).toBeInTheDocument();
    expect(screen.getByText('Documents Complete')).toBeInTheDocument();
  });

  it('renders nothing when values are null', () => {
    const { container } = render(
      <WorksheetSubresult worksheetCode="APP-E" values={null} />
    );
    expect(container.firstChild).toBeNull();
  });
});
