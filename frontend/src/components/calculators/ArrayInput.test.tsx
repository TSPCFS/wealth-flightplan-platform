import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArrayInput } from './ArrayInput';
import type { CalculatorInputSpec } from '../../types/content.types';

const debtSpec: CalculatorInputSpec = {
  name: 'debts',
  label: 'Debts',
  type: 'array',
  min_items: 1,
  max_items: 3,
  item_schema: [
    { name: 'name', label: 'Account', type: 'text' },
    { name: 'balance', label: 'Balance', type: 'number', format: 'currency', min: 0 },
    { name: 'annual_rate_pct', label: 'Rate', type: 'number', format: 'percent', min: 0, max: 50 },
  ],
};

const seedRows = [
  { name: 'Card A', balance: 10000, annual_rate_pct: 24 },
];

describe('ArrayInput', () => {
  it('renders one input per column per row with formatted column labels', () => {
    render(<ArrayInput spec={debtSpec} value={seedRows} onChange={() => {}} />);
    // Column headers include format-aware suffixes
    expect(screen.getByText('Balance (R)')).toBeInTheDocument();
    expect(screen.getByText('Rate (%)')).toBeInTheDocument();
    // Cell inputs hold the seeded values
    expect((screen.getByLabelText(/Debts row 1 Account/i) as HTMLInputElement).value).toBe('Card A');
    expect((screen.getByLabelText(/Debts row 1 Balance/i) as HTMLInputElement).value).toBe('10000');
  });

  it('emits onChange with updated row when a cell is edited', () => {
    const onChange = vi.fn();
    render(<ArrayInput spec={debtSpec} value={seedRows} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Debts row 1 Balance/i), {
      target: { value: '12500' },
    });
    expect(onChange).toHaveBeenCalledWith([
      { name: 'Card A', balance: 12500, annual_rate_pct: 24 },
    ]);
  });

  it('adds a blank row up to max_items and disables Add when reached', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ArrayInput spec={debtSpec} value={seedRows} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newRows = onChange.mock.calls[0][0];
    expect(newRows).toHaveLength(2);
    expect(newRows[1]).toEqual({ name: '', balance: 0, annual_rate_pct: 0 });

    // Saturate to max_items=3
    const saturated = [
      ...seedRows,
      { name: '', balance: 0, annual_rate_pct: 0 },
      { name: '', balance: 0, annual_rate_pct: 0 },
    ];
    rerender(<ArrayInput spec={debtSpec} value={saturated} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Add row/i })).toBeDisabled();
  });

  it('removes a row but never below min_items', () => {
    const onChange = vi.fn();
    const twoRows = [
      ...seedRows,
      { name: 'Card B', balance: 5000, annual_rate_pct: 18 },
    ];
    const { rerender } = render(
      <ArrayInput spec={debtSpec} value={twoRows} onChange={onChange} />
    );
    fireEvent.click(screen.getByLabelText(/Remove Debts row 2/i));
    expect(onChange).toHaveBeenCalledWith(seedRows);

    rerender(<ArrayInput spec={debtSpec} value={seedRows} onChange={onChange} />);
    expect(screen.getByLabelText(/Remove Debts row 1/i)).toBeDisabled();
  });
});
