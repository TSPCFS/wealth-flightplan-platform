import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies the attooh-lime primary variant by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-attooh-lime');
  });

  it('applies the secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-attooh-slate');
  });

  it('applies the ghost variant for dark backgrounds', () => {
    render(<Button variant="ghost">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('text-white');
  });

  it('applies the danger variant', () => {
    render(<Button variant="danger">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-attooh-danger');
  });

  it('applies a small size when requested', () => {
    render(<Button size="sm">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-[13px]');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
