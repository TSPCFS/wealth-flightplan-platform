import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import type { ProfileResponse } from '../types/api.types';

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

import { userService } from '../services/user.service';

const profile: ProfileResponse = {
  user_id: 'u1',
  email: 'ada@b.co',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email_verified: true,
  subscription_tier: 'free',
  current_stage: 'Foundation',
  latest_assessment_id: null,
  is_business_owner: false,
  primary_language: 'en',
  timezone: 'SAST',
  created_at: '2026-01-15T10:00:00Z',
  household_income_monthly_after_tax: 85000,
  household_size: 4,
  number_of_dependants: 2,
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders personal details, account section, and disabled privacy actions', async () => {
    vi.mocked(userService.getProfile).mockResolvedValue(profile);
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('ada@b.co')).toBeInTheDocument());
    expect(screen.getByRole('form', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download my data/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeDisabled();
  });

  it('shows the error block when the profile fetch fails', async () => {
    vi.mocked(userService.getProfile).mockRejectedValue(new Error('nope'));
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('nope')).toBeInTheDocument());
  });
});
