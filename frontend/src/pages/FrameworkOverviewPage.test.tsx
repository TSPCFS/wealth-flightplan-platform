import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FrameworkOverviewPage } from './FrameworkOverviewPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    getFramework: vi.fn(),
  },
}));

describe('FrameworkOverviewPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders a card per framework step', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getFramework).mockResolvedValue({
      steps: [
        {
          step_number: '1',
          title: 'Financial GPS',
          subtitle: 'Know your position',
          description: 'd',
          key_metrics: [],
          time_estimate_minutes: 90,
          stage_relevance: [],
          related_example_codes: [],
          related_worksheet_codes: [],
        },
        {
          step_number: '4a',
          title: 'Insurance',
          subtitle: 'Cover the downside',
          description: 'd',
          key_metrics: [],
          time_estimate_minutes: 45,
          stage_relevance: [],
          related_example_codes: [],
          related_worksheet_codes: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <FrameworkOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Financial GPS')).toBeInTheDocument());
    expect(screen.getByText('Insurance')).toBeInTheDocument();
    expect(screen.getByText('~90 min')).toBeInTheDocument();
  });

  it('shows an error message when the framework fetch fails', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getFramework).mockRejectedValue(new Error('nope'));
    render(
      <MemoryRouter>
        <FrameworkOverviewPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('nope')).toBeInTheDocument());
  });
});
