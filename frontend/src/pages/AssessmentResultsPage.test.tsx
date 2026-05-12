import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AssessmentResultsPage } from './AssessmentResultsPage';

vi.mock('../services/assessment.service', () => ({
  assessmentService: {
    getOne: vi.fn(),
  },
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/assessments/results/:id" element={<AssessmentResultsPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('AssessmentResultsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders StageDisplay + recommendations for a 5Q result', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.getOne).mockResolvedValue({
      assessment_id: 'r1',
      assessment_type: '5q',
      total_score: 13,
      calculated_stage: 'Freedom',
      previous_stage: 'Momentum',
      stage_details: {
        name: 'Freedom',
        income_runway: '3-12 months',
        description: 'Mostly debt-free; investing 20%+.',
      },
      recommendations: ['Do the Net Worth Statement', 'Review TFSA'],
      created_at: '2026-05-12T10:30:00Z',
      responses: { q1: 'c', q2: 'd', q3: 'b', q4: 'a', q5: 'c' },
      completion_time_seconds: 95,
    });

    renderAt('/assessments/results/r1');
    await waitFor(() => expect(screen.getByText('Freedom')).toBeInTheDocument());
    expect(screen.getByTestId('stage-delta')).toHaveTextContent('Up from Momentum');
    expect(screen.getByText('Do the Net Worth Statement')).toBeInTheDocument();
    expect(screen.getByText('Review TFSA')).toBeInTheDocument();
  });

  it('renders the gap_test band + grouped gaps + advisor recommendation', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.getOne).mockResolvedValue({
      assessment_id: 'g1',
      assessment_type: 'gap_test',
      total_score: 13,
      band: 'meaningful_gaps',
      gaps_identified: [
        {
          question_code: 'q3',
          title: 'Monthly Money Conversation',
          current_status: 'no',
          priority: 'high',
          recommendation: 'Schedule it this week.',
        },
        {
          question_code: 'q2',
          title: 'Monthly surplus accuracy',
          current_status: 'partially',
          priority: 'medium',
          recommendation: 'Tighten budget tracking.',
        },
      ],
      advisor_recommendation: 'Book a GAP Plan™ conversation',
      gap_plan_eligible: true,
      created_at: '2026-05-12T10:30:00Z',
      responses: {},
      completion_time_seconds: 240,
    });

    renderAt('/assessments/results/g1');
    await waitFor(() => expect(screen.getByText('Meaningful gaps')).toBeInTheDocument());
    expect(screen.getByText('Book a GAP Plan™ conversation')).toBeInTheDocument();
    expect(screen.getByText('High priority')).toBeInTheDocument();
    expect(screen.getByText('Medium priority')).toBeInTheDocument();
    expect(screen.getByText('Monthly Money Conversation')).toBeInTheDocument();
  });

  it('renders an error message when the fetch fails', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.getOne).mockRejectedValue(new Error('not found'));
    renderAt('/assessments/results/missing');
    await waitFor(() => expect(screen.getByText('not found')).toBeInTheDocument());
  });
});
