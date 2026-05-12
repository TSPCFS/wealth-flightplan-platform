import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmailVerificationPage } from './EmailVerificationPage';

vi.mock('../services/auth.service', () => ({
  authService: {
    verify: vi.fn(),
  },
}));

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <EmailVerificationPage />
    </MemoryRouter>
  );

describe('EmailVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error when no token is in the URL', async () => {
    renderAt('');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/verification token is missing/i)
    );
  });

  it('verifies the token on mount and shows success', async () => {
    const { authService } = await import('../services/auth.service');
    vi.mocked(authService.verify).mockResolvedValue({
      email_verified: true,
      message: 'ok',
    });

    renderAt('?token=abc123');

    await waitFor(() => expect(authService.verify).toHaveBeenCalledWith('abc123'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/verified successfully/i)
    );
  });

  it('shows an error when verification fails', async () => {
    const { authService } = await import('../services/auth.service');
    vi.mocked(authService.verify).mockRejectedValue(new Error('Token expired'));

    renderAt('?token=expired');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Token expired')
    );
  });
});
