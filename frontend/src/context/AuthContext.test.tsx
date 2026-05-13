import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthContext, AuthProvider } from './AuthContext';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api';

vi.mock('../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    verify: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}));

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn(),
  },
}));

const mockUser = {
  user_id: '00000000-0000-0000-0000-000000000001',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User',
  email_verified: true,
  subscription_tier: 'free',
  current_stage: null,
  latest_assessment_id: null,
  is_business_owner: false,
  primary_language: 'en',
  timezone: 'SAST',
  created_at: '2026-05-12T10:30:00Z',
};

const renderProbe = () =>
  render(
    <AuthProvider>
      <AuthContext.Consumer>
        {(ctx) => (
          <div>
            <div data-testid="status">{ctx?.status}</div>
            <div data-testid="email">{ctx?.user?.email ?? ''}</div>
            <button onClick={() => ctx?.login({ email: 'a@b.co', password: 'pw' })}>login</button>
            <button onClick={() => ctx?.logout()}>logout</button>
          </div>
        )}
      </AuthContext.Consumer>
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // resetAllMocks clears prior mockResolvedValue / mockRejectedValue setups,
    // not just call history; required so test order doesn't bleed state.
    vi.resetAllMocks();
  });

  it('starts unauthenticated when no refresh token is stored', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    );
  });

  it('attempts silent profile fetch on mount when refresh token exists', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'access');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh');
    const { userService } = await import('../services/user.service');
    vi.mocked(userService.getProfile).mockResolvedValue(mockUser);

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    );
    expect(screen.getByTestId('email')).toHaveTextContent('test@test.com');
    expect(userService.getProfile).toHaveBeenCalledOnce();
  });

  it('clears tokens and lands unauthenticated when silent refresh fails', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'stale');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'stale');
    const { userService } = await import('../services/user.service');
    vi.mocked(userService.getProfile).mockRejectedValue(new Error('boom'));

    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    );
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('login transitions to authenticated and exposes the user', async () => {
    const { authService } = await import('../services/auth.service');
    vi.mocked(authService.login).mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 3600,
      user: mockUser,
    });

    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    );
    expect(screen.getByTestId('email')).toHaveTextContent('test@test.com');
  });

  it('logout calls the service with refresh_token and clears state', async () => {
    const { authService } = await import('../services/auth.service');
    const { userService } = await import('../services/user.service');
    vi.mocked(userService.getProfile).mockResolvedValue(mockUser);
    vi.mocked(authService.login).mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r-token',
      token_type: 'Bearer',
      expires_in: 3600,
      user: mockUser,
    });
    vi.mocked(authService.logout).mockResolvedValue({ message: 'ok' });
    localStorage.setItem(REFRESH_TOKEN_KEY, 'r-token');

    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('status')).not.toHaveTextContent('loading')
    );

    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    );

    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    );
    expect(authService.logout).toHaveBeenCalledWith({ refresh_token: 'r-token' });
  });

  it('logout still tears down client state when the service errors', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'r');
    const { authService } = await import('../services/auth.service');
    const { userService } = await import('../services/user.service');
    vi.mocked(userService.getProfile).mockResolvedValue(mockUser);
    vi.mocked(authService.logout).mockRejectedValue(new Error('server down'));

    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    );

    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    );
  });
});
