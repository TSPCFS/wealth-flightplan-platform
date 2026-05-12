import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StageCelebration } from './StageCelebration';

describe('StageCelebration', () => {
  it('renders the upward modal with a "What this means" link to /framework', () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <StageCelebration
          celebration={{ direction: 'up', previous: 'Momentum', next: 'Freedom' }}
          description="Mostly debt-free; investing 20%+."
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Reached Freedom');
    expect(screen.getByText(/You've reached Freedom!/)).toBeInTheDocument();
    expect(screen.getByText('Up from Momentum.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /what this means/i })).toHaveAttribute(
      'href',
      '/framework'
    );
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders the softer downward banner with a recommendations link', () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <StageCelebration
          celebration={{ direction: 'down', previous: 'Freedom', next: 'Momentum' }}
          description="Your latest assessment moved you back."
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/placed you back in Momentum/);
    expect(screen.getByRole('link', { name: /open recommendations/i })).toHaveAttribute(
      'href',
      '/recommendations'
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
