import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ResetProgressModal } from './ResetProgressModal';

vi.mock('../../services/user.service', () => ({
  userService: { resetProgress: vi.fn() },
}));

import { userService } from '../../services/user.service';

describe('ResetProgressModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ResetProgressModal open={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialog with both kept/deleted lists when open', () => {
    render(<ResetProgressModal open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/Reset all your testing data\?/)).toBeInTheDocument();
    expect(screen.getByText(/Will be deleted/)).toBeInTheDocument();
    expect(screen.getByText(/Will be kept/)).toBeInTheDocument();
  });

  it('keeps confirm disabled until the user types RESET exactly', () => {
    render(<ResetProgressModal open onClose={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: /confirm reset/i });
    const input = screen.getByLabelText(/type reset to confirm/i);
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'reset' } });
    expect(confirm).toBeDisabled(); // case-sensitive
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(confirm).not.toBeDisabled();
  });

  it('POSTs and reloads on success', async () => {
    vi.mocked(userService.resetProgress).mockResolvedValue({
      deleted: { assessments: 7, worksheet_responses: 4, example_interactions: 19, user_progress_rows: 1 },
      preserved: ['user_account', 'audit_logs'],
      message: 'Progress reset.',
    });
    const onReload = vi.fn();
    render(<ResetProgressModal open onClose={vi.fn()} onReload={onReload} />);

    fireEvent.change(screen.getByLabelText(/type reset to confirm/i), {
      target: { value: 'RESET' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }));
    });
    await waitFor(() => expect(userService.resetProgress).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/Progress reset — reloading/i)
    );
    // Wait for the deferred reload.
    await waitFor(() => expect(onReload).toHaveBeenCalled(), { timeout: 1500 });
  });

  it('surfaces an error message inline and keeps the modal open', async () => {
    vi.mocked(userService.resetProgress).mockRejectedValue({ message: 'Reset failed' });
    render(<ResetProgressModal open onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/type reset to confirm/i), {
      target: { value: 'RESET' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }));
    });
    await waitFor(() => expect(screen.getByText('Reset failed')).toBeInTheDocument());
    // Still open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ResetProgressModal open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
