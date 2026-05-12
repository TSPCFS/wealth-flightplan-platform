import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';

const renderLoginForm = () => {
  return render(
    <BrowserRouter>
      <LoginForm />
    </BrowserRouter>
  );
};

describe('LoginForm', () => {
  it('renders login form with all fields', () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as any);
    renderLoginForm();

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as any);
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('has link to forgot password', () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as any);
    renderLoginForm();

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('has link to register', () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as any);
    renderLoginForm();

    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });
});
