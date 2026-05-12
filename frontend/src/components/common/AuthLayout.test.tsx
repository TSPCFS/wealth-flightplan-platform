import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renders title', () => {
    render(<AuthLayout title="Sign in">Content</AuthLayout>);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<AuthLayout title="Sign in" subtitle="Welcome back">Content</AuthLayout>);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<AuthLayout title="Sign in"><div>Child content</div></AuthLayout>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<AuthLayout title="Sign in">Content</AuthLayout>);
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });
});
