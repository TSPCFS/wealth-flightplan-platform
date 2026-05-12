import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickStats } from './QuickStats';

describe('QuickStats', () => {
  it('formats currency + percent stats and hides hints when present', () => {
    render(
      <MemoryRouter>
        <QuickStats
          stats={{
            net_worth: 2600000,
            monthly_surplus: 5000,
            total_consumer_debt: 0,
            income_generating_pct: 46.2,
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/R\s?2\s?600\s?000/)).toBeInTheDocument();
    expect(screen.getByText(/46\.2%/)).toBeInTheDocument();
    expect(screen.queryByText(/Complete Net Worth Statement/)).not.toBeInTheDocument();
  });

  it('renders em-dash and a CTA link for nullable stats', () => {
    render(
      <MemoryRouter>
        <QuickStats
          stats={{
            net_worth: null,
            monthly_surplus: null,
            total_consumer_debt: null,
            income_generating_pct: null,
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    const cta = screen.getAllByRole('link', { name: /Net Worth Statement/i })[0];
    expect(cta).toHaveAttribute('href', '/worksheets/APP-B');
  });
});
