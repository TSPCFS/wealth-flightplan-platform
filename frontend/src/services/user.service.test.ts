import { describe, it, expect, vi } from 'vitest';
import { userService } from './user.service';

vi.mock('./api', () => ({
  apiClient: {
    getProfile: vi.fn(),
  },
}));

describe('userService', () => {
  describe('getProfile', () => {
    it('calls apiClient.getProfile and returns user data', async () => {
      const { apiClient } = await import('./api');
      const mockProfile = {
        user_id: '123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        email_verified: true,
        subscription_tier: 'free',
        current_stage: null,
        latest_assessment_id: null,
        created_at: '2024-01-01',
      };
      vi.mocked(apiClient.getProfile).mockResolvedValue(mockProfile);

      const result = await userService.getProfile();

      expect(apiClient.getProfile).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });
  });
});
