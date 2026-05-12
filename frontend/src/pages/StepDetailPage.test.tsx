import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StepDetailPage } from './StepDetailPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    getStep: vi.fn(),
  },
}));

const renderAt = (step: string) =>
  render(
    <MemoryRouter initialEntries={[`/framework/${step}`]}>
      <Routes>
        <Route path="/framework/:stepNumber" element={<StepDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('StepDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders body_markdown as HTML and shows related-example chips', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getStep).mockResolvedValue({
      step_number: '6',
      title: 'Investment',
      subtitle: 'Compound your way out',
      description: 'Long-form text.',
      key_metrics: ['Years', 'Rate'],
      time_estimate_minutes: 60,
      stage_relevance: [],
      related_example_codes: ['WE-3', 'WE-4'],
      related_worksheet_codes: ['APP-B'],
      body_markdown: '## A heading\n\nSome **bold** text.',
    });

    renderAt('6');

    await waitFor(() => expect(screen.getByText('Investment')).toBeInTheDocument());
    expect(screen.getByText('Long-form text.')).toBeInTheDocument();
    // Markdown rendered: bold lives inside a <strong>.
    const body = screen.getByTestId('step-body');
    expect(body.querySelector('h2')?.textContent).toBe('A heading');
    expect(body.querySelector('strong')?.textContent).toBe('bold');
    // Related example chips link to /examples/:code
    const chip = screen.getByText('WE-3');
    expect(chip.closest('a')).toHaveAttribute('href', '/examples/WE-3');
    // Related worksheets render as live links to /worksheets/:code.
    const worksheetLink = screen.getByText(/APP-B/);
    expect(worksheetLink.closest('a')).toHaveAttribute('href', '/worksheets/APP-B');
  });

  it('rejects an unknown step number', async () => {
    renderAt('99');
    await waitFor(() => expect(screen.getByText('Unknown step number')).toBeInTheDocument());
  });
});
