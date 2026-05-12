import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentHistoryPage } from './AssessmentHistoryPage';

vi.mock('../services/assessment.service', () => ({
  assessmentService: {
    getHistory: vi.fn(),
  },
}));

describe('AssessmentHistoryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders progression + submissions list when history exists', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.getHistory).mockResolvedValue({
      current_stage: 'Freedom',
      stage_progression: [
        { stage: 'Foundation', score: 12, date: '2026-01-15T08:00:00Z' },
        { stage: 'Momentum', score: 18, date: '2026-03-20T08:00:00Z' },
        { stage: 'Freedom', score: 28, date: '2026-05-12T10:30:00Z' },
      ],
      assessments: [
        {
          assessment_id: '3',
          assessment_type: '10q',
          total_score: 28,
          calculated_stage: 'Freedom',
          band: null,
          created_at: '2026-05-12T10:30:00Z',
        },
        {
          assessment_id: '2',
          assessment_type: 'gap_test',
          total_score: 13,
          calculated_stage: null,
          band: 'meaningful_gaps',
          created_at: '2026-04-01T10:30:00Z',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AssessmentHistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('10-Question')).toBeInTheDocument());
    expect(screen.getByText('GAP Test')).toBeInTheDocument();
    expect(screen.getByText(/Current stage:/)).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
  });

  it('shows an empty-state when there are no submissions', async () => {
    const { assessmentService } = await import('../services/assessment.service');
    vi.mocked(assessmentService.getHistory).mockResolvedValue({
      current_stage: null,
      stage_progression: [],
      assessments: [],
    });

    render(
      <MemoryRouter>
        <AssessmentHistoryPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/start building your progression timeline/i)).toBeInTheDocument()
    );
    expect(screen.getByText('No assessments yet.')).toBeInTheDocument();
  });
});
