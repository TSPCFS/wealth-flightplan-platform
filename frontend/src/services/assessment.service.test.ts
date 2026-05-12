import { describe, it, expect, vi } from 'vitest';
import { assessmentService } from './assessment.service';

vi.mock('./api', () => ({
  ACCESS_TOKEN_KEY: 'wfp.access_token',
  REFRESH_TOKEN_KEY: 'wfp.refresh_token',
  apiClient: {
    submit5q: vi.fn(),
    submit10q: vi.fn(),
    submitGap: vi.fn(),
    getAssessmentHistory: vi.fn(),
    getAssessment: vi.fn(),
  },
}));

const fiveQStub = {
  assessment_id: 'a',
  assessment_type: '5q' as const,
  total_score: 13,
  calculated_stage: 'Freedom' as const,
  previous_stage: null,
  stage_details: { name: 'Freedom' as const, income_runway: 'x', description: 'y' },
  recommendations: [],
  created_at: '',
};

describe('assessmentService', () => {
  it('submit5q forwards responses and completion time', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.submit5q).mockResolvedValue(fiveQStub);
    await assessmentService.submit5q({ q1: 'a' }, 42);
    expect(apiClient.submit5q).toHaveBeenCalledWith({
      responses: { q1: 'a' },
      completion_time_seconds: 42,
    });
  });

  it('submit10q forwards through apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.submit10q).mockResolvedValue({ ...fiveQStub, assessment_type: '10q' });
    await assessmentService.submit10q({ q1: 'a' });
    expect(apiClient.submit10q).toHaveBeenCalledWith({
      responses: { q1: 'a' },
      completion_time_seconds: undefined,
    });
  });

  it('submitGap forwards through apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.submitGap).mockResolvedValue({
      assessment_id: 'g',
      assessment_type: 'gap_test',
      total_score: 0,
      band: 'wide_gaps',
      gaps_identified: [],
      advisor_recommendation: '',
      gap_plan_eligible: true,
      created_at: '',
    });
    await assessmentService.submitGap({ q1: 'yes' }, 10);
    expect(apiClient.submitGap).toHaveBeenCalledWith({
      responses: { q1: 'yes' },
      completion_time_seconds: 10,
    });
  });

  it('getHistory and getOne delegate to apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.getAssessmentHistory).mockResolvedValue({
      assessments: [],
      current_stage: null,
      stage_progression: [],
    });
    vi.mocked(apiClient.getAssessment).mockResolvedValue({
      ...fiveQStub,
      responses: { q1: 'a', q2: 'a', q3: 'a', q4: 'a', q5: 'a' },
      completion_time_seconds: null,
    });
    await assessmentService.getHistory();
    await assessmentService.getOne('xyz');
    expect(apiClient.getAssessmentHistory).toHaveBeenCalled();
    expect(apiClient.getAssessment).toHaveBeenCalledWith('xyz');
  });
});
