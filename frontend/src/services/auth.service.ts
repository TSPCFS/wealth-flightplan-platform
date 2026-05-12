import { apiClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './api';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyResponse,
  LogoutRequest,
  LogoutResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
} from '../types/api.types';

export const authService = {
  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.register(data);
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.login(data);
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
    return response;
  },

  verify: (token: string): Promise<VerifyResponse> => {
    return apiClient.verify(token);
  },

  logout: async (data: LogoutRequest): Promise<LogoutResponse> => {
    try {
      const response = await apiClient.logout(data);
      return response;
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  requestPasswordReset: (data: PasswordResetRequest): Promise<PasswordResetResponse> => {
    return apiClient.requestPasswordReset(data);
  },

  confirmPasswordReset: (
    data: PasswordResetConfirmRequest
  ): Promise<PasswordResetConfirmResponse> => {
    return apiClient.confirmPasswordReset(data);
  },
};
