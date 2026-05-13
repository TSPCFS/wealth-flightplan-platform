import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renders exactly one <main> landmark with id="main"', () => {
    const { container } = render(
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
    const { container } = render(<AppLayout maxWidth="wide">x</AppLayout>);
    const main = container.querySelector('main');
    expect(main?.className).toContain('max-w-6xl');
  });
});
