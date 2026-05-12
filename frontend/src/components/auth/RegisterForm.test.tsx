import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';

vi.mock('../../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
  },
}));

const renderRegisterForm = () => {
  return render(
    <BrowserRouter>
      <RegisterForm />
    </BrowserRouter>
  );
};

describe('RegisterForm', () => {
  it('renders registration form with all required fields', () => {
    renderRegisterForm();

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderRegisterForm();

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'invalid' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass123!' } });
    fireEvent.change(inputs[2], { target: { value: 'ValidPass123!' } });
    fireEvent.change(inputs[3], { target: { value: 'Test' } });
    fireEvent.change(inputs[4], { target: { value: 'User' } });
    fireEvent.click(inputs[8]);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('shows validation error for weak password', async () => {
    renderRegisterForm();

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'test@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'weak' } });
    fireEvent.change(inputs[2], { target: { value: 'weak' } });
    fireEvent.change(inputs[3], { target: { value: 'Test' } });
    fireEvent.change(inputs[4], { target: { value: 'User' } });
    fireEvent.click(inputs[8]);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', async () => {
    renderRegisterForm();

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[1], { target: { value: 'StrongPass123!' } });

    await waitFor(() => {
      expect(screen.getByText(/strong|good|fair|weak/i)).toBeInTheDocument();
    });
  });

  it('shows success message after successful registration', async () => {
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.register).mockResolvedValue({
      user_id: '123',
      email: 'test@test.com',
      email_verified: false as const,
      message: 'Success',
    });

    renderRegisterForm();

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'test@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'StrongPass123!' } });
    fireEvent.change(inputs[2], { target: { value: 'StrongPass123!' } });
    fireEvent.change(inputs[3], { target: { value: 'Test' } });
    fireEvent.change(inputs[4], { target: { value: 'User' } });
    fireEvent.click(inputs[8]);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
  });

  it('shows error message on registration failure', async () => {
    const { authService } = await import('../../services/auth.service');
    vi.mocked(authService.register).mockRejectedValue(new Error('Email already exists'));

    renderRegisterForm();

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'test@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'StrongPass123!' } });
    fireEvent.change(inputs[2], { target: { value: 'StrongPass123!' } });
    fireEvent.change(inputs[3], { target: { value: 'Test' } });
    fireEvent.change(inputs[4], { target: { value: 'User' } });
    fireEvent.click(inputs[8]);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });
});
