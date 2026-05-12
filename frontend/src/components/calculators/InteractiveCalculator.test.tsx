import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InteractiveCalculator } from './InteractiveCalculator';
import type { ExampleDetail } from '../../types/content.types';

vi.mock('../../services/content.service', () => ({
  contentService: {
    calculate: vi.fn(),
  },
}));

const compoundExample: ExampleDetail = {
  example_code: 'WE-3',
  title: 'R5k/month for 25 years',
  step_number: '6',
  chapter: 'Step 6',
  description: '',
  key_principle: '',
  key_takeaway: '',
  educational_text: '',
  stage_relevance: ['Freedom'],
  calculator_type: 'compound_interest',
  related_example_codes: [],
  calculator_config: {
    inputs: [
      {
        name: 'monthly_contribution',
        label: 'Monthly contribution (R)',
        type: 'number',
        default: 5000,
        min: 0,
        step: 500,
        format: 'currency',
      },
      {
        name: 'years',
        label: 'Years',
        type: 'number',
        default: 25,
        min: 1,
        max: 60,
        step: 1,
        format: 'integer',
      },
      {
        name: 'annual_rate_pct',
        label: 'Annual growth rate (%)',
        type: 'number',
        default: 10,
        min: 0,
        max: 25,
        step: 0.5,
        format: 'percent',
      },
    ],
    interpretation_template:
      'At R{monthly_contribution}/month for {years} years at {annual_rate_pct}% growth, you accumulate R{final_amount}.',
  },
};

const compoundResponse = {
  example_code: 'WE-3',
  calculator_type: 'compound_interest' as const,
  inputs: {
    monthly_contribution: 5000,
    years: 25,
    annual_rate_pct: 10,
    initial_amount: 0,
    withdrawal_rate_pct: 4,
  },
  outputs: {
    final_amount: 6400000,
    total_contributed: 1500000,
    total_growth: 4900000,
    monthly_passive_income: 21333.33,
    year_by_year: [
      { year: 1, balance: 62800, contributions_to_date: 60000, growth_to_date: 2800 },
    ],
  },
  interpretation:
    'At R5,000/month for 25 years at 10% growth, you accumulate R6,400,000.',
};

describe('InteractiveCalculator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders inputs from config with their defaults pre-filled', () => {
    render(<InteractiveCalculator exampleDetail={compoundExample} />);
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs[0].value).toBe('5000');
    expect(inputs[1].value).toBe('25');
    expect(inputs[2].value).toBe('10');
  });

  it('calls calculate() on submit and renders the headline result', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.calculate).mockResolvedValue(compoundResponse);
    render(<InteractiveCalculator exampleDetail={compoundExample} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    });

    await waitFor(() => expect(contentService.calculate).toHaveBeenCalledTimes(1));
    const [code, inputs] = vi.mocked(contentService.calculate).mock.calls[0];
    expect(code).toBe('WE-3');
    expect(inputs).toMatchObject({ monthly_contribution: 5000, years: 25, annual_rate_pct: 10 });

    await waitFor(() => expect(screen.getByText(/Final amount/i)).toBeInTheDocument());
    expect(screen.getByText(/R\s?6\s?400\s?000/)).toBeInTheDocument();
  });

  it('shows a friendly error when the API rejects', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.calculate).mockRejectedValue({
      code: 'VALIDATION_ERROR',
      message: 'Years must be ≥1',
    });
    render(<InteractiveCalculator exampleDetail={compoundExample} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    });
    await waitFor(() => expect(screen.getByText('Years must be ≥1')).toBeInTheDocument());
  });

  it('reset clears values and hides the result', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.calculate).mockResolvedValue(compoundResponse);
    render(<InteractiveCalculator exampleDetail={compoundExample} />);

    const yearsInput = (screen.getAllByRole('spinbutton') as HTMLInputElement[])[1];
    fireEvent.change(yearsInput, { target: { value: '35' } });
    expect(yearsInput.value).toBe('35');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    });
    await waitFor(() => expect(screen.getByText(/Final amount/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    expect((screen.getAllByRole('spinbutton') as HTMLInputElement[])[1].value).toBe('25');
    expect(screen.queryByText(/Final amount/i)).not.toBeInTheDocument();
  });

  it('renders an educational-only note when calculator_config is null', () => {
    render(
      <InteractiveCalculator
        exampleDetail={{
          ...compoundExample,
          calculator_type: null,
          calculator_config: null,
        }}
      />
    );
    expect(screen.getByText(/Educational only/i)).toBeInTheDocument();
  });

  it('renders a select-type input from the config and dispatches its value', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.calculate).mockResolvedValue(compoundResponse);

    render(
      <InteractiveCalculator
        exampleDetail={{
          ...compoundExample,
          calculator_config: {
            ...compoundExample.calculator_config!,
            inputs: [
              ...compoundExample.calculator_config!.inputs,
              {
                name: 'method',
                label: 'Strategy',
                type: 'select',
                default: 'snowball',
                options: [
                  { value: 'snowball', label: 'Snowball' },
                  { value: 'avalanche', label: 'Avalanche' },
                ],
              },
            ],
          },
        }}
      />
    );

    const select = screen.getByLabelText('Strategy') as HTMLSelectElement;
    expect(select.value).toBe('snowball');
    fireEvent.change(select, { target: { value: 'avalanche' } });
    expect(select.value).toBe('avalanche');
  });

  it('copies the formatted interpretation to the clipboard', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.calculate).mockResolvedValue(compoundResponse);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<InteractiveCalculator exampleDetail={compoundExample} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copy interpretation/i })).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy interpretation/i }));
    });
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toMatch(/At R5,?000\/month/);
  });
});
