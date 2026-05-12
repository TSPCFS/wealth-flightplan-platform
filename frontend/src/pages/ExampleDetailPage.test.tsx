import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExampleDetailPage } from './ExampleDetailPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    getExample: vi.fn(),
    calculate: vi.fn(),
  },
}));

const renderAt = (code: string) =>
  render(
    <MemoryRouter initialEntries={[`/examples/${code}`]}>
      <Routes>
        <Route path="/examples/:exampleCode" element={<ExampleDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ExampleDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders title, key principle, takeaway, and the calculator form', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getExample).mockResolvedValue({
      example_code: 'WE-3',
      title: 'R5k/month for 25 years',
      step_number: '6',
      chapter: 'Step 6: Investment',
      description: 'Long-form description.',
      key_principle: 'Magic of consistency.',
      key_takeaway: 'Time horizon beats contribution amount.',
      educational_text: '## Teaching\n\nSome **markdown**.',
      stage_relevance: ['Foundation'],
      calculator_type: 'compound_interest',
      related_example_codes: ['WE-4'],
      calculator_config: {
        inputs: [
          {
            name: 'monthly_contribution',
            label: 'Monthly contribution (R)',
            type: 'number',
            default: 5000,
          },
        ],
        interpretation_template: 'r',
      },
    });

    renderAt('WE-3');

    await waitFor(() =>
      expect(screen.getByText('R5k/month for 25 years')).toBeInTheDocument()
    );
    expect(screen.getByText('Magic of consistency.')).toBeInTheDocument();
    expect(screen.getByText('Time horizon beats contribution amount.')).toBeInTheDocument();
    expect(screen.getByText('Long-form description.')).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly contribution (R)')).toBeInTheDocument();
    // Markdown rendered (strong)
    const eduSection = screen.getByTestId('example-educational');
    expect(eduSection.querySelector('strong')?.textContent).toBe('markdown');
  });

  it('renders an educational-only note when the example has no calculator', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getExample).mockResolvedValue({
      example_code: 'WE-X',
      title: 'Reference only',
      step_number: '1',
      chapter: 'Step 1',
      description: '',
      key_principle: 'p',
      key_takeaway: 't',
      educational_text: '',
      stage_relevance: [],
      calculator_type: null,
      calculator_config: null,
      related_example_codes: [],
    });
    renderAt('WE-X');
    await waitFor(() =>
      expect(screen.getByText(/Educational only/i)).toBeInTheDocument()
    );
  });
});
