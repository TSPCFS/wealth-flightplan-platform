import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn(),
  },
}));

import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/user.service';

const baseProfile = {
  user_id: 'u1',
  email: 'a@b.co',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email_verified: true,
  subscription_tier: 'free',
  created_at: '2026-05-12T10:30:00Z',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        ...baseProfile,
      },
      status: 'authenticated',
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
    });
  });

  it('shows the current stage and links when a stage exists', async () => {
    vi.mocked(userService.getProfile).mockResolvedValue({
      ...baseProfile,
      current_stage: 'Freedom',
      latest_assessment_id: 'r1',
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Freedom')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /take another assessment/i })).toHaveAttribute(
      'href',
      '/assessments'
    );
    expect(screen.getByRole('link', { name: /view history/i })).toHaveAttribute(
      'href',
      '/assessments/history'
    );
  });

  it('prompts to take the first assessment when no stage is set', async () => {
    vi.mocked(userService.getProfile).mockResolvedValue({
      ...baseProfile,
      current_stage: null,
      latest_assessment_id: null,
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/Take your first assessment/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /start an assessment/i })).toHaveAttribute(
      'href',
      '/assessments'
    );
  });
});
