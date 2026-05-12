/// <reference types="vite/client" />

import type {
  ApiError as ApiErrorBody,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyResponse,
  RefreshRequest,
  RefreshResponse,
  LogoutRequest,
  LogoutResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  ProfileResponse,
} from '../types/api.types';

// localStorage token keys. HttpOnly cookies are post-MVP.
export const ACCESS_TOKEN_KEY = 'wfp.access_token';
export const REFRESH_TOKEN_KEY = 'wfp.refresh_token';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body?.error?.message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code || 'UNKNOWN_ERROR';
    this.details = body?.error?.details;
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async parseError(response: Response): Promise<ApiError> {
    let body: ApiErrorBody;
    try {
      body = await response.json();
    } catch {
      body = {
        error: {
          code: 'NETWORK_ERROR',
          message: `Request failed with status ${response.status}`,
        },
      };
    }
    return new ApiError(response.status, body);
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken } as RefreshRequest),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    const data: RefreshResponse = await response.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    return data.access_token;
  }

  private clearTokensAndRedirect(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const buildHeaders = (token?: string | null): Record<string, string> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.headers) {
        Object.assign(headers, options.headers as Record<string, string>);
      }
      if (requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    };

    const initialToken = requiresAuth ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    let response = await fetch(url, { ...options, headers: buildHeaders(initialToken) });

    // Auto-refresh on 401, once. On second failure, clear tokens and redirect.
    if (
      response.status === 401 &&
      requiresAuth &&
      localStorage.getItem(REFRESH_TOKEN_KEY)
    ) {
      try {
        const newToken = await this.refreshAccessToken();
        response = await fetch(url, { ...options, headers: buildHeaders(newToken) });
        if (response.status === 401) {
          this.clearTokensAndRedirect();
          throw await this.parseError(response);
        }
      } catch (err) {
        this.clearTokensAndRedirect();
        throw err;
      }
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.apiRequest<RegisterResponse>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) },
      false
    );
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.apiRequest<LoginResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
      false
    );
  }

  async verify(token: string): Promise<VerifyResponse> {
    return this.apiRequest<VerifyResponse>(
      `/auth/verify?token=${encodeURIComponent(token)}`,
      {},
      false
    );
  }

  async refresh(data: RefreshRequest): Promise<RefreshResponse> {
    return this.apiRequest<RefreshResponse>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify(data) },
      false
    );
  }

  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    return this.apiRequest<LogoutResponse>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<PasswordResetResponse> {
    return this.apiRequest<PasswordResetResponse>(
      '/auth/password-reset',
      { method: 'POST', body: JSON.stringify(data) },
      false
    );
  }

  async confirmPasswordReset(
    data: PasswordResetConfirmRequest
  ): Promise<PasswordResetConfirmResponse> {
    return this.apiRequest<PasswordResetConfirmResponse>(
      '/auth/password-reset/confirm',
      { method: 'POST', body: JSON.stringify(data) },
      false
    );
  }

  // User endpoints
  async getProfile(): Promise<ProfileResponse> {
    return this.apiRequest<ProfileResponse>('/users/profile');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
