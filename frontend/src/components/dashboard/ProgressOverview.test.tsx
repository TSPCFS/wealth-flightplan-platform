import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressOverview } from './ProgressOverview';

describe('ProgressOverview', () => {
  it('renders a filled segment for each completed step', () => {
    render(
      <MemoryRouter>
        <ProgressOverview
          progress={{
            framework_completion_pct: 28,
            steps_completed: 2,
            steps_total: 7,
            current_focus_step: '3',
            next_step: { step_number: '3', title: 'Money Matrix' },
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/2 of 7 steps complete/)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 · Money Matrix/)).toBeInTheDocument();
    const segments = screen.getAllByTestId('progress-segment');
    expect(segments).toHaveLength(7);
    const filled = segments.filter((s) => s.className.includes('bg-attooh-lime'));
    expect(filled).toHaveLength(2);
  });
});
