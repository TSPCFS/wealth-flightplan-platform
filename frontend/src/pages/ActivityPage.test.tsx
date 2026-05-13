import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityPage } from './ActivityPage';
import { activityFirstPage, activitySecondPage } from '../test/dashboard-fixtures';

vi.mock('../services/user.service', () => ({
  userService: { getActivity: vi.fn() },
}));

import { userService } from '../services/user.service';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>
  );

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('round-trips cursor pagination via Load more', async () => {
    vi.mocked(userService.getActivity)
      .mockResolvedValueOnce(activityFirstPage)
      .mockResolvedValueOnce(activitySecondPage);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Completed 10Q/)).toBeInTheDocument()
    );
    // First call: no cursor
    expect(vi.mocked(userService.getActivity).mock.calls[0]).toEqual([undefined, 20]);
    // Stage_changed gets a direction badge
    expect(screen.getByTestId('stage-direction')).toHaveTextContent('Up');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    });
    await waitFor(() =>
      expect(screen.getByText(/Submitted Zero-Based Budget/)).toBeInTheDocument()
    );
    // Second call: includes the cursor returned from the first page
    expect(vi.mocked(userService.getActivity).mock.calls[1]).toEqual(['cursor-2', 20]);
    // No more pages → Load more button gone
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('renders an empty-state CTA when there is no activity yet', async () => {
    vi.mocked(userService.getActivity).mockResolvedValue({
      events: [],
      next_cursor: null,
      has_more: false,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('activity-empty')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /take an assessment/i })).toHaveAttribute(
      'href',
      '/assessments'
    );
  });

  it('mounts inside <main id="main">', async () => {
    vi.mocked(userService.getActivity).mockResolvedValue({
      events: [],
      next_cursor: null,
      has_more: false,
    });
    renderPage();
    await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('id', 'main'));
  });
});
