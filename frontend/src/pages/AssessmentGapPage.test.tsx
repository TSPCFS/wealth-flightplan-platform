import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AssessmentGapPage } from './AssessmentGapPage';
import { QUESTIONS_GAP } from '../data/assessment-questions';

vi.mock('../services/assessment.service', () => ({
  assessmentService: {
    submitGap: vi.fn(),
  },
}));

describe('AssessmentGapPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('answers all 12 GAP items and submits with yes/partially/no values', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.submitGap).mockResolvedValue({
      assessment_id: 'gap-1',
      assessment_type: 'gap_test',
      total_score: 24,
      band: 'solid_plan',
      gaps_identified: [],
      advisor_recommendation: '',
      gap_plan_eligible: false,
      created_at: '2026-05-12T10:30:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/assessments/gap']}>
        <Routes>
          <Route path="/assessments/gap" element={<AssessmentGapPage />} />
          <Route
            path="/assessments/results/:id"
            element={<div data-testid="results">RESULTS</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    for (let i = 0; i < QUESTIONS_GAP.length; i++) {
      fireEvent.click(screen.getByLabelText('Yes'));
      if (i < QUESTIONS_GAP.length - 1) fireEvent.click(screen.getByText('Next'));
    }

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));
    });
    await waitFor(() => expect(assessmentService.submitGap).toHaveBeenCalled());
    const [responses] = vi.mocked(assessmentService.submitGap).mock.calls[0];
    expect(Object.keys(responses)).toHaveLength(12);
    expect(Object.values(responses).every((v) => v === 'yes')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
  });
});
