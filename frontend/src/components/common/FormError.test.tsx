import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormError } from './FormError';

describe('FormError', () => {
  it('renders error message when provided', () => {
    render(<FormError error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders nothing when no error', () => {
    const { container } = render(<FormError />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when error is undefined', () => {
    const { container } = render(<FormError error={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
