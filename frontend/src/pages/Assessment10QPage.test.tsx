import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Assessment10QPage } from './Assessment10QPage';
import { QUESTIONS_10Q } from '../data/assessment-questions';

vi.mock('../services/assessment.service', () => ({
  assessmentService: {
    submit10q: vi.fn(),
  },
}));

describe('Assessment10QPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('walks all 10 questions, submits, and navigates to /results/:id', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.submit10q).mockResolvedValue({
      assessment_id: '10q-1',
      assessment_type: '10q',
      total_score: 28,
      calculated_stage: 'Freedom',
      previous_stage: null,
      stage_details: { name: 'Freedom', income_runway: '', description: '' },
      recommendations: [],
      created_at: '2026-05-12T10:30:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/assessments/10q']}>
        <Routes>
          <Route path="/assessments/10q" element={<Assessment10QPage />} />
          <Route
            path="/assessments/results/:id"
            element={<div data-testid="results">RESULTS</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    for (let i = 0; i < QUESTIONS_10Q.length; i++) {
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);
      if (i < QUESTIONS_10Q.length - 1) fireEvent.click(screen.getByText('Next'));
    }

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));
    });
    await waitFor(() => expect(assessmentService.submit10q).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
  });
});
