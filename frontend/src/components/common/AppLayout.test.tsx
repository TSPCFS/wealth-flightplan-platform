import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

const wrap = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AppLayout', () => {
  it('renders exactly one <main> landmark with id="main"', () => {
    const { container } = wrap(
      <AppLayout>
        <p>hello</p>
      </AppLayout>
    );
    const mains = container.querySelectorAll('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main');
    expect(mains[0]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('uses the requested max-width modifier', () => {
    const { container } = wrap(<AppLayout maxWidth="wide">x</AppLayout>);
    const main = container.querySelector('main');
    expect(main?.className).toContain('max-w-6xl');
  });

  it('mounts the primary nav by default', () => {
    wrap(
      <AppLayout>
        <p>x</p>
      </AppLayout>
    );
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('hides the nav when showNav is false', () => {
    wrap(
      <AppLayout showNav={false}>
        <p>x</p>
      </AppLayout>
    );
    expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument();
  });
});
