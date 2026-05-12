import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorksheetSectionFields } from './WorksheetSectionFields';
import type { CalculatorInputSpec } from '../../types/content.types';

describe('WorksheetSectionFields', () => {
  it('renders number, text, and select inputs and dispatches onChange', () => {
    const fields: CalculatorInputSpec[] = [
      { name: 'amount', label: 'Amount', type: 'number', format: 'currency' },
      { name: 'note', label: 'Note', type: 'text' },
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { value: 'a', label: 'Avalanche' },
          { value: 's', label: 'Snowball' },
        ],
      },
    ];
    const onChange = vi.fn();
    render(
      <WorksheetSectionFields
        fields={fields}
        value={{ amount: 100, note: '', method: '' }}
        errors={{}}
        onChange={onChange}
        sectionTotal={100}
      />
    );

    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 's' } });
    expect(onChange).toHaveBeenCalledWith('note', 'hello');
    expect(onChange).toHaveBeenCalledWith('method', 's');
    expect(screen.getByText(/Section total:/)).toBeInTheDocument();
  });

  it('renders an inline error message when present', () => {
    render(
      <WorksheetSectionFields
        fields={[{ name: 'amount', label: 'Amount', type: 'number' }]}
        value={{}}
        errors={{ amount: 'Required' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('accepts plain-string select options', () => {
    render(
      <WorksheetSectionFields
        fields={[
          {
            name: 'colour',
            label: 'Colour',
            type: 'select',
            options: ['red', 'green'],
          },
        ]}
        value={{ colour: '' }}
        errors={{}}
        onChange={vi.fn()}
      />
    );
    const select = screen.getByLabelText('Colour') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toContain('red');
  });
});
