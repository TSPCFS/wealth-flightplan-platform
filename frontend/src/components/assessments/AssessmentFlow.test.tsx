import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentFlow } from './AssessmentFlow';
import type { AssessmentQuestion } from '../../data/assessment-questions';

// AssessmentFlow renders inside AppLayout, which mounts the routed TopNav,
// so every render needs a router context.
const withRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const QUESTIONS: AssessmentQuestion[] = [
  {
    code: 'q1',
    prompt: 'Q1?',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  },
  {
    code: 'q2',
    prompt: 'Q2?',
    options: [
      { value: 'a', label: 'A2' },
      { value: 'b', label: 'B2' },
    ],
  },
];

const advanceAnswers = () => {
  fireEvent.click(screen.getByLabelText('A'));
  fireEvent.click(screen.getByText('Next'));
  fireEvent.click(screen.getByLabelText('B2'));
};

describe('AssessmentFlow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('disables Next until the current question is answered', () => {
    withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const next = screen.getByText('Next');
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByLabelText('A'));
    expect(next).not.toBeDisabled();
  });

  it('Back navigates to the previous question', () => {
    withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Q2?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Q1?')).toBeInTheDocument();
    // Previously selected value is still checked.
    expect(screen.getByLabelText('A')).toBeChecked();
  });

  it('submits merged responses with an elapsed time', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={onSubmit}
      />
    );
    advanceAnswers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));
    });
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [responses, elapsed] = onSubmit.mock.calls[0];
    expect(responses).toEqual({ q1: 'a', q2: 'b' });
    expect(typeof elapsed).toBe('number');
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it('persists answers to localStorage and restores them on remount', () => {
    const { unmount } = withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('A'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByLabelText('B2'));
    unmount();

    withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={vi.fn()}
      />
    );
    // We landed back on Q2 with B2 still selected
    expect(screen.getByText('Q2?')).toBeInTheDocument();
    expect(screen.getByLabelText('B2')).toBeChecked();
  });

  it('maps VALIDATION_ERROR details into a field-level error', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      code: 'VALIDATION_ERROR',
      message: 'Bad',
      details: { q1: ['Required'] },
    });
    withRouter(
      <AssessmentFlow
        type="5q"
        questions={QUESTIONS}
        title="Test"
        onSubmit={onSubmit}
      />
    );
    advanceAnswers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));
    });
    await waitFor(() => expect(screen.getByText('Some answers need review.')).toBeInTheDocument());
    // Flow jumped back to q1
    expect(screen.getByText('Q1?')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
