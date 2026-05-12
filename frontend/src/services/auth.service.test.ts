import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

// Mock the apiClient; re-export the storage-key constants so auth.service.ts
// can read them from the mocked module.
vi.mock('./api', () => ({
  ACCESS_TOKEN_KEY: 'wfp.access_token',
  REFRESH_TOKEN_KEY: 'wfp.refresh_token',
  apiClient: {
    register: vi.fn(),
    login: vi.fn(),
    verify: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    it('calls apiClient.register with correct data', async () => {
      const { apiClient } = await import('./api');
      const mockResponse = { user_id: '123', email: 'test@test.com', email_verified: false as const, message: 'Success' };
      vi.mocked(apiClient.register).mockResolvedValue(mockResponse);

      const data = { email: 'test@test.com', password: 'Password123!', first_name: 'Test', last_name: 'User' };
      const result = await authService.register(data);

      expect(apiClient.register).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('login', () => {
    it('calls apiClient.login and stores tokens', async () => {
      const { apiClient } = await import('./api');
      const mockResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'bearer',
        expires_in: 3600,
        user: { user_id: '123', email: 'test@test.com', first_name: 'Test', last_name: 'User', email_verified: true, subscription_tier: 'free', created_at: '2024-01-01' },
      };
      vi.mocked(apiClient.login).mockResolvedValue(mockResponse);

      const data = { email: 'test@test.com', password: 'Password123!' };
      const result = await authService.login(data);

      expect(apiClient.login).toHaveBeenCalledWith(data);
      expect(localStorage.getItem('wfp.access_token')).toBe('access123');
      expect(localStorage.getItem('wfp.refresh_token')).toBe('refresh123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verify', () => {
    it('calls apiClient.verify with token', async () => {
      const { apiClient } = await import('./api');
      const mockResponse = { email_verified: true as const, message: 'Verified' };
      vi.mocked(apiClient.verify).mockResolvedValue(mockResponse);

      const result = await authService.verify('token123');

      expect(apiClient.verify).toHaveBeenCalledWith('token123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('calls apiClient.logout and clears tokens', async () => {
      const { apiClient } = await import('./api');
      localStorage.setItem('wfp.access_token', 'access123');
      localStorage.setItem('wfp.refresh_token', 'refresh123');

      vi.mocked(apiClient.logout).mockResolvedValue({ message: 'Logged out' });

      const result = await authService.logout({ refresh_token: 'refresh123' });

      expect(apiClient.logout).toHaveBeenCalledWith({ refresh_token: 'refresh123' });
      expect(localStorage.getItem('wfp.access_token')).toBeNull();
      expect(localStorage.getItem('wfp.refresh_token')).toBeNull();
      expect(result).toEqual({ message: 'Logged out' });
    });
  });

  describe('requestPasswordReset', () => {
    it('calls apiClient.requestPasswordReset with email', async () => {
      const { apiClient } = await import('./api');
      vi.mocked(apiClient.requestPasswordReset).mockResolvedValue({ message: 'Reset email sent' });

      const result = await authService.requestPasswordReset({ email: 'test@test.com' });

      expect(apiClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(result).toEqual({ message: 'Reset email sent' });
    });
  });

  describe('confirmPasswordReset', () => {
    it('calls apiClient.confirmPasswordReset with data', async () => {
      const { apiClient } = await import('./api');
      vi.mocked(apiClient.confirmPasswordReset).mockResolvedValue({ message: 'Password reset' });

      const data = { token: 'token123', new_password: 'NewPass123!' };
      const result = await authService.confirmPasswordReset(data);

      expect(apiClient.confirmPasswordReset).toHaveBeenCalledWith(data);
      expect(result).toEqual({ message: 'Password reset' });
    });
  });
});
