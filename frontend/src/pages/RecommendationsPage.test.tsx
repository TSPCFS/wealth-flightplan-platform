import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecommendationsPage } from './RecommendationsPage';
import { recommendationsFixture } from '../test/dashboard-fixtures';

vi.mock('../services/user.service', () => ({
  userService: { getRecommendations: vi.fn() },
}));

import { userService } from '../services/user.service';

describe('RecommendationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders immediate actions, reading path, suggested examples and worksheets', async () => {
    vi.mocked(userService.getRecommendations).mockResolvedValue(recommendationsFixture);
    render(
      <MemoryRouter>
        <RecommendationsPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText(/Complete the Net Worth Statement/)).toBeInTheDocument()
    );
    // "Money Matrix" appears in both a recommendation reason and a reading-path link.
    expect(screen.getAllByText(/Money Matrix/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Hennie's Net Worth/)).toBeInTheDocument();
    // Suggested worksheet link
    const wsLinks = screen.getAllByRole('link', { name: /Net Worth Statement/i });
    expect(wsLinks.some((a) => a.getAttribute('href') === '/worksheets/APP-B')).toBe(true);
  });
});
