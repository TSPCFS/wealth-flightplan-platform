import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorksheetStatusBanner } from './WorksheetStatusBanner';

describe('WorksheetStatusBanner', () => {
  it('renders status label, message, and recommendations', () => {
    render(
      <WorksheetStatusBanner
        feedback={{
          status: 'needs_attention',
          message: 'Needs exceeds 50%.',
          recommendations: ['Review bond', 'Audit subscriptions'],
        }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Needs attention/i);
    expect(screen.getByText('Needs exceeds 50%.')).toBeInTheDocument();
    expect(screen.getByText('Review bond')).toBeInTheDocument();
    expect(screen.getByText('Audit subscriptions')).toBeInTheDocument();
  });

  it('renders on_track tone for healthy status', () => {
    render(
      <WorksheetStatusBanner
        feedback={{ status: 'on_track', message: 'Solid.', recommendations: [] }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('On track');
  });
});
