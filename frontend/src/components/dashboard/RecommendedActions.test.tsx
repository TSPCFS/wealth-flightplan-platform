import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecommendedActions } from './RecommendedActions';

const actions = [
  {
    priority: 'high' as const,
    title: 'Complete Net Worth Statement',
    reason: 'Foundation for Step 3.',
    action_url: '/worksheets/APP-B',
    estimated_time_minutes: 45,
  },
  {
    priority: 'medium' as const,
    title: 'Refresh Risk Cover',
    reason: 'Last reviewed >12mo ago.',
    action_url: '/worksheets/APP-C',
  },
  {
    priority: 'low' as const,
    title: 'Read Step 3',
    reason: 'Optional reading.',
    action_url: '/framework/3',
  },
];

describe('RecommendedActions', () => {
  it('renders one row per action and links to action_url', () => {
    render(
      <MemoryRouter>
        <RecommendedActions actions={actions} />
      </MemoryRouter>
    );
    expect(screen.getByText('Complete Net Worth Statement')).toBeInTheDocument();
    const highLink = screen.getByText('Complete Net Worth Statement').closest('a');
    expect(highLink).toHaveAttribute('href', '/worksheets/APP-B');
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('caps the visible list at capAt', () => {
    render(
      <MemoryRouter>
        <RecommendedActions actions={actions} capAt={2} />
      </MemoryRouter>
    );
    expect(screen.getByText('Complete Net Worth Statement')).toBeInTheDocument();
    expect(screen.getByText('Refresh Risk Cover')).toBeInTheDocument();
    expect(screen.queryByText('Read Step 3')).not.toBeInTheDocument();
  });

  it('renders a friendly empty-state', () => {
    render(
      <MemoryRouter>
        <RecommendedActions actions={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Nothing pressing/i)).toBeInTheDocument();
  });
});
