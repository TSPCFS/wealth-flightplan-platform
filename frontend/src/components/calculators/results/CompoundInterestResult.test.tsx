import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompoundInterestResult } from './CompoundInterestResult';
import type { CompoundInterestOutput } from '../../../types/content.types';

const outputs: CompoundInterestOutput = {
  final_amount: 6400000,
  total_contributed: 1500000,
  total_growth: 4900000,
  monthly_passive_income: 21333.33,
  year_by_year: [
    { year: 1, balance: 62800, contributions_to_date: 60000, growth_to_date: 2800 },
    { year: 2, balance: 132240, contributions_to_date: 120000, growth_to_date: 12240 },
  ],
};

describe('CompoundInterestResult', () => {
  it('renders the headline KPI numbers', () => {
    render(<CompoundInterestResult outputs={outputs} />);
    expect(screen.getByText(/R\s?6\s?400\s?000/)).toBeInTheDocument();
    expect(screen.getByText(/R\s?21\s?333/)).toBeInTheDocument();
    expect(screen.getByText(/R\s?1\s?500\s?000/)).toBeInTheDocument();
  });

  it('expands the year-by-year table on demand', () => {
    render(<CompoundInterestResult outputs={outputs} />);
    expect(screen.queryByText('Year')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Year-by-year table'));
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 data
  });
});
