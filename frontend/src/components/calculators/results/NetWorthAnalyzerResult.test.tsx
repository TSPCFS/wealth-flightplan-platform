import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetWorthAnalyzerResult } from './NetWorthAnalyzerResult';
import type { NetWorthAnalyzerOutput } from '../../../types/content.types';

const outputs: NetWorthAnalyzerOutput = {
  total_lifestyle_assets: 4500000,
  total_income_generating_assets: 1200000,
  total_assets: 5700000,
  total_liabilities: 3100000,
  net_worth: 2600000,
  income_generating_pct_of_net_worth: 46.2,
  interpretation: '46% of your net worth is income-generating. Healthy households target 60%+.',
};

describe('NetWorthAnalyzerResult', () => {
  it('renders net worth, ratio, and interpretation', () => {
    render(<NetWorthAnalyzerResult outputs={outputs} />);
    expect(screen.getByText(/R\s?2\s?600\s?000/)).toBeInTheDocument();
    expect(screen.getByText(/46\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/Healthy households target 60%/)).toBeInTheDocument();
  });
});
