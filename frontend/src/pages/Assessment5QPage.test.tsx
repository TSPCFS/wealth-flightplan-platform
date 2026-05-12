import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Assessment5QPage } from './Assessment5QPage';
import { QUESTIONS_5Q } from '../data/assessment-questions';

vi.mock('../services/assessment.service', () => ({
  assessmentService: {
    submit5q: vi.fn(),
  },
}));

describe('Assessment5QPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('walks every question, submits, and navigates to the results route', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.submit5q).mockResolvedValue({
      assessment_id: 'res-1',
      assessment_type: '5q',
      total_score: 13,
      calculated_stage: 'Freedom',
      previous_stage: null,
      stage_details: {
        name: 'Freedom',
        income_runway: '3-12 months',
        description: 'desc',
      },
      recommendations: ['One'],
      created_at: '2026-05-12T10:30:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/assessments/5q']}>
        <Routes>
          <Route path="/assessments/5q" element={<Assessment5QPage />} />
          <Route
            path="/assessments/results/:id"
            element={<div data-testid="results">RESULTS</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    for (let i = 0; i < QUESTIONS_5Q.length; i++) {
      // Pick option 'c' on every question (label varies).
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[2]);
      if (i < QUESTIONS_5Q.length - 1) {
        fireEvent.click(screen.getByText('Next'));
      }
    }

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));
    });

    await waitFor(() => expect(assessmentService.submit5q).toHaveBeenCalled());
    const [responses, elapsed] = vi.mocked(assessmentService.submit5q).mock.calls[0];
    expect(Object.keys(responses)).toHaveLength(5);
    for (const v of Object.values(responses)) expect(v).toBe('c');
    expect(typeof elapsed).toBe('number');

    await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
  });
});
