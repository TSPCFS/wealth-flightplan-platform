import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './user.service';

vi.mock('./api', () => ({
  apiClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getDashboard: vi.fn(),
    getRecommendations: vi.fn(),
    getUserProgress: vi.fn(),
    getActivity: vi.fn(),
    getMilestones: vi.fn(),
    setStepComplete: vi.fn(),
    setStepIncomplete: vi.fn(),
    resetProgress: vi.fn(),
  },
}));

const mockProfile = {
  user_id: '123',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User',
  email_verified: true,
  subscription_tier: 'free',
  current_stage: null,
  latest_assessment_id: null,
  is_business_owner: false,
  primary_language: 'en',
  timezone: 'SAST',
  created_at: '2024-01-01',
};

describe('userService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getProfile / updateProfile / getDashboard / getRecommendations delegate to apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.getProfile).mockResolvedValue(mockProfile);
    vi.mocked(apiClient.updateProfile).mockResolvedValue(mockProfile);
    vi.mocked(apiClient.getDashboard).mockResolvedValue({} as never);
    vi.mocked(apiClient.getRecommendations).mockResolvedValue({} as never);

    await userService.getProfile();
    await userService.updateProfile({ first_name: 'Ada' });
    await userService.getDashboard();
    await userService.getRecommendations();

    expect(apiClient.getProfile).toHaveBeenCalled();
    expect(apiClient.updateProfile).toHaveBeenCalledWith({ first_name: 'Ada' });
    expect(apiClient.getDashboard).toHaveBeenCalled();
    expect(apiClient.getRecommendations).toHaveBeenCalled();
  });

  it('getProgress / getActivity / getMilestones forward to apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.getUserProgress).mockResolvedValue({} as never);
    vi.mocked(apiClient.getActivity).mockResolvedValue({} as never);
    vi.mocked(apiClient.getMilestones).mockResolvedValue({} as never);

    await userService.getProgress();
    await userService.getActivity('cursor-1', 20);
    await userService.getMilestones();

    expect(apiClient.getUserProgress).toHaveBeenCalled();
    expect(apiClient.getActivity).toHaveBeenCalledWith('cursor-1', 20);
    expect(apiClient.getMilestones).toHaveBeenCalled();
  });

  it('resetProgress delegates to apiClient', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.resetProgress).mockResolvedValue({
      deleted: { assessments: 1, worksheet_responses: 0, example_interactions: 0, user_progress_rows: 1 },
      preserved: ['user_account'],
      message: 'ok',
    });
    await userService.resetProgress();
    expect(apiClient.resetProgress).toHaveBeenCalled();
  });

  it('setStepComplete branches to setStepComplete vs setStepIncomplete', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.setStepComplete).mockResolvedValue({} as never);
    vi.mocked(apiClient.setStepIncomplete).mockResolvedValue({} as never);

    await userService.setStepComplete('3', true);
    expect(apiClient.setStepComplete).toHaveBeenCalledWith('3');

    await userService.setStepComplete('3', false);
    expect(apiClient.setStepIncomplete).toHaveBeenCalledWith('3');
  });
});
