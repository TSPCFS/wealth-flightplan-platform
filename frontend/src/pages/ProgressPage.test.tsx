import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressPage } from './ProgressPage';
import { progressFixture } from '../test/dashboard-fixtures';

vi.mock('../services/user.service', () => ({
  userService: {
    getProgress: vi.fn(),
    setStepComplete: vi.fn(),
  },
}));

import { userService } from '../services/user.service';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>
  );

describe('ProgressPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('optimistically flips a step to complete and persists the server response', async () => {
    vi.mocked(userService.getProgress).mockResolvedValue(progressFixture);
    vi.mocked(userService.setStepComplete).mockResolvedValue({
      ...progressFixture,
      overall_completion_pct: 43,
      steps_completed: 3,
      steps: progressFixture.steps.map((s) =>
        s.step_number === '3'
          ? { ...s, is_completed: true, completed_at: '2026-05-12T10:30:00Z' }
          : s
      ),
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Money Matrix')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /mark step 3 complete/i })
      );
    });
    // Server response landed → "43%" header
    await waitFor(() => expect(screen.getByText('43%')).toBeInTheDocument());
    expect(userService.setStepComplete).toHaveBeenCalledWith('3', true);
  });

  it('reverts the optimistic flip when the server errors', async () => {
    vi.mocked(userService.getProgress).mockResolvedValue(progressFixture);
    vi.mocked(userService.setStepComplete).mockRejectedValue(new Error('boom'));

    renderPage();
    await waitFor(() => expect(screen.getByText('Money Matrix')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /mark step 3 complete/i })
      );
    });
    // Original 28% still displayed
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /mark step 3 complete/i })
      ).not.toBeDisabled()
    );
    expect(screen.getByText('28%')).toBeInTheDocument();
    expect(screen.getByText(/Could not update step/)).toBeInTheDocument();
  });
});
