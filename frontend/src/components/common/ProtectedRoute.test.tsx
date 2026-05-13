import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';

describe('ProtectedRoute', () => {
  it('renders loading spinner when status is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'loading' } as any);
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'unauthenticated' } as any);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute><div>Protected content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'authenticated' } as any);
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('requireAdmin: redirects to /dashboard when user is not admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { user_id: 'u1', email: 'a@b.co', is_admin: false },
    } as any);
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requireAdmin><div>Admin content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('requireAdmin: renders children when user is admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { user_id: 'u1', email: 'a@b.co', is_admin: true },
    } as any);
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute requireAdmin><div>Admin content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
