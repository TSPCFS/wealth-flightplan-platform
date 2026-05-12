import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProfileForm } from './ProfileForm';
import type { ProfileResponse } from '../../types/api.types';

vi.mock('../../services/user.service', () => ({
  userService: { updateProfile: vi.fn() },
}));

import { userService } from '../../services/user.service';

const profile: ProfileResponse = {
  user_id: 'u1',
  email: 'a@b.co',
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

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('disables submit until a field is dirty', () => {
    render(<ProfileForm profile={profile} onSaved={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /save changes/i });
    expect(submit).toBeDisabled();
  });

  it('rejects an empty first_name with a validation error', async () => {
    render(<ProfileForm profile={profile} onSaved={vi.fn()} />);
    // Input.tsx renders <label> next to <input> without a htmlFor, so we
    // locate the field by its pre-populated value rather than label text.
    fireEvent.change(screen.getByDisplayValue('Ada'), { target: { value: '' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });
    await waitFor(() =>
      expect(screen.getByText('First name is required')).toBeInTheDocument()
    );
    expect(userService.updateProfile).not.toHaveBeenCalled();
  });

  it('PATCHes on a happy edit and shows the Saved toast', async () => {
    const onSaved = vi.fn();
    vi.mocked(userService.updateProfile).mockResolvedValue({
      ...profile,
      is_business_owner: true,
    });
    render(<ProfileForm profile={profile} onSaved={onSaved} />);
    fireEvent.click(screen.getByLabelText(/business owner/i));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });
    await waitFor(() => expect(userService.updateProfile).toHaveBeenCalled());
    expect(vi.mocked(userService.updateProfile).mock.calls[0][0]).toMatchObject({
      is_business_owner: true,
    });
    await waitFor(() => expect(screen.getByTestId('profile-saved-toast')).toBeInTheDocument());
    expect(onSaved).toHaveBeenCalled();
  });

  it('surfaces a server error message', async () => {
    vi.mocked(userService.updateProfile).mockRejectedValue({ message: 'Server hiccup' });
    render(<ProfileForm profile={profile} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/business owner/i));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });
    await waitFor(() => expect(screen.getByText('Server hiccup')).toBeInTheDocument());
  });
});
