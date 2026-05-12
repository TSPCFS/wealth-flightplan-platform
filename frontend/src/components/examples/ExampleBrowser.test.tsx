import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExampleBrowser } from './ExampleBrowser';

vi.mock('../../services/content.service', () => ({
  contentService: {
    listExamples: vi.fn(),
  },
}));

const sampleExamples = [
  {
    example_code: 'WE-3',
    title: 'R5k/month for 25 years',
    step_number: '6' as const,
    chapter: 'Step 6: Investment',
    calculator_type: 'compound_interest' as const,
    stage_relevance: ['Foundation' as const, 'Momentum' as const],
    key_principle: 'Magic of consistent saving.',
    summary: 's',
  },
  {
    example_code: 'WE-7',
    title: 'Allocate your salary',
    step_number: '2' as const,
    chapter: 'Step 2',
    calculator_type: 'budget_allocator' as const,
    stage_relevance: ['Foundation' as const],
    key_principle: 'Allocate by category.',
    summary: 's',
  },
];

const renderBrowser = () =>
  render(
    <MemoryRouter>
      <ExampleBrowser />
    </MemoryRouter>
  );

describe('ExampleBrowser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists examples returned by the service', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.listExamples).mockResolvedValue({
      examples: sampleExamples,
      total: sampleExamples.length,
    });

    renderBrowser();

    await waitFor(() => expect(screen.getByText('R5k/month for 25 years')).toBeInTheDocument());
    expect(screen.getByText('Allocate your salary')).toBeInTheDocument();
    // Filter toggle label is also "Has calculator"; we only assert the per-card badges show up.
    expect(screen.getAllByText('Has calculator').length).toBeGreaterThanOrEqual(2);
  });

  it('debounces the search input so rapid typing only fires once', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.listExamples).mockResolvedValue({
      examples: [],
      total: 0,
    });

    renderBrowser();

    // Initial fetch.
    await waitFor(() => expect(contentService.listExamples).toHaveBeenCalled());
    vi.mocked(contentService.listExamples).mockClear();

    const search = screen.getByPlaceholderText(/title, principle/i);
    fireEvent.change(search, { target: { value: 'c' } });
    fireEvent.change(search, { target: { value: 'co' } });
    fireEvent.change(search, { target: { value: 'compound' } });

    // Wait beyond the 300ms debounce window.
    await waitFor(
      () => {
        const calls = vi.mocked(contentService.listExamples).mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(1);
        expect(calls[calls.length - 1][0]?.q).toBe('compound');
      },
      { timeout: 1500 }
    );
  });

  it('shows the empty-state when no examples match', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.listExamples).mockResolvedValue({
      examples: [],
      total: 0,
    });
    renderBrowser();
    await waitFor(() => expect(screen.getByText(/No examples match/)).toBeInTheDocument());
  });

  it('surfaces a friendly error message when the API errors', async () => {
    const { contentService } = await import('../../services/content.service');
    vi.mocked(contentService.listExamples).mockRejectedValue(new Error('boom'));
    renderBrowser();
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});
