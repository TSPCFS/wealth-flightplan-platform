import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { emptyDashboard, populatedDashboard } from '../test/dashboard-fixtures';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../services/user.service', () => ({
  userService: {
    getDashboard: vi.fn(),
    getProfile: vi.fn(),
  },
}));

import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/user.service';

const renderDash = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

const stubAuth = () =>
  vi.mocked(useAuth).mockReturnValue({
    user: {
      user_id: 'u1',
      email: 'a@b.co',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email_verified: true,
      subscription_tier: 'free',
    },
    status: 'authenticated',
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  });

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    stubAuth();
  });

  it('renders every section from a populated dashboard payload', async () => {
    vi.mocked(userService.getDashboard).mockResolvedValue(populatedDashboard);

    renderDash();

    await waitFor(() => expect(screen.getByText('Freedom')).toBeInTheDocument());
    // Stage hero + runway
    expect(screen.getByText(/Income runway: 3-12 months/)).toBeInTheDocument();
    // Progress overview
    expect(screen.getByText(/2 of 7 steps complete/)).toBeInTheDocument();
    // Recommended actions
    expect(screen.getByText(/Complete the Net Worth Statement/)).toBeInTheDocument();
    // Recent activity
    expect(screen.getByText(/Completed 10Q assessment/)).toBeInTheDocument();
    // Upcoming milestones
    expect(screen.getByText('Monthly Money Conversation')).toBeInTheDocument();
    // Quick stats
    expect(screen.getByText(/R\s?2\s?600\s?000/)).toBeInTheDocument();
  });

  it('shows the empty stage CTA and "—" stats for a fresh user', async () => {
    vi.mocked(userService.getDashboard).mockResolvedValue(emptyDashboard);

    renderDash();

    await waitFor(() =>
      expect(screen.getByTestId('stage-hero-empty')).toBeInTheDocument()
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('link', { name: /start an assessment/i })).toBeInTheDocument();
    // First-run intro renders on truly empty dashboards
    expect(screen.getByText(/How the Wealth FlightPlan™ works/)).toBeInTheDocument();
  });

  it('does NOT render the first-run intro when stage is set', async () => {
    vi.mocked(userService.getDashboard).mockResolvedValue(populatedDashboard);
    renderDash();
    await waitFor(() => expect(screen.getByText('Freedom')).toBeInTheDocument());
    expect(screen.queryByText(/How the Wealth FlightPlan™ works/)).not.toBeInTheDocument();
  });

  it('does NOT render the first-run intro when recent_activity is non-empty', async () => {
    vi.mocked(userService.getDashboard).mockResolvedValue({
      ...emptyDashboard,
      recent_activity: [
        {
          event_type: 'assessment_submitted',
          title: 'Took an assessment',
          timestamp: '2026-05-12T10:30:00Z',
        },
      ],
    });
    renderDash();
    await waitFor(() =>
      expect(screen.getByTestId('stage-hero-empty')).toBeInTheDocument()
    );
    expect(screen.queryByText(/How the Wealth FlightPlan™ works/)).not.toBeInTheDocument();
  });

  it('surfaces a friendly error when the dashboard fetch fails', async () => {
    vi.mocked(userService.getDashboard).mockRejectedValue(new Error('boom'));
    renderDash();
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});
