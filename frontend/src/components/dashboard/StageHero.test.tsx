import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StageHero } from './StageHero';

describe('StageHero', () => {
  it('renders the stage, runway, and progress bar', () => {
    render(
      <MemoryRouter>
        <StageHero
          stageDetails={{
            name: 'Freedom',
            description: 'desc',
            income_runway: '3-12 months',
            progress_to_next_stage_pct: 45,
            next_stage: 'Independence',
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Freedom')).toBeInTheDocument();
    expect(screen.getByText(/Income runway: 3-12 months/)).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '45');
  });

  it('renders the empty-state CTA when no stage is set', () => {
    render(
      <MemoryRouter>
        <StageHero stageDetails={null} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('stage-hero-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start an assessment/i })).toHaveAttribute(
      'href',
      '/assessments'
    );
  });

  it('hides the progress bar when there is no next stage (Abundance)', () => {
    render(
      <MemoryRouter>
        <StageHero
          stageDetails={{
            name: 'Abundance',
            description: 'desc',
            income_runway: 'indefinite',
            progress_to_next_stage_pct: 100,
            next_stage: null,
          }}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
