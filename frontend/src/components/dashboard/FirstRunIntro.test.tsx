import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FirstRunIntro, INTRO_DISMISSED_KEY } from './FirstRunIntro';

describe('FirstRunIntro', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the heading and three bullets', () => {
    render(<FirstRunIntro />);
    expect(screen.getByText(/How the Wealth FlightPlan™ works/)).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('persists dismissal to localStorage and hides on next mount', () => {
    const { unmount } = render(<FirstRunIntro />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss intro/i }));
    expect(localStorage.getItem(INTRO_DISMISSED_KEY)).toBe('1');
    // It immediately disappears on this mount
    expect(screen.queryByText(/How the Wealth FlightPlan™ works/)).not.toBeInTheDocument();
    unmount();

    const { container } = render(<FirstRunIntro />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on mount when previously dismissed', () => {
    localStorage.setItem(INTRO_DISMISSED_KEY, '1');
    const { container } = render(<FirstRunIntro />);
    expect(container.firstChild).toBeNull();
  });
});
