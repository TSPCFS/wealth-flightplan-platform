import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationsList } from './RecommendationsList';

describe('RecommendationsList', () => {
  it('renders each recommendation as a bullet', () => {
    render(<RecommendationsList recommendations={['Do A', 'Do B']} />);
    expect(screen.getByText('Do A')).toBeInTheDocument();
    expect(screen.getByText('Do B')).toBeInTheDocument();
  });

  it('renders nothing when the list is empty', () => {
    const { container } = render(<RecommendationsList recommendations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
