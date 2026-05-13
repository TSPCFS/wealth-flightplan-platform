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
import type {
  AssessmentDetail,
  AssessmentHistoryResponse,
  GapAssessmentResult,
  StageAssessmentResult,
  SubmitGapAssessmentRequest,
  SubmitLetterAssessmentRequest,
} from '../types/assessment.types';
import type {
  CalculateInputs,
  CalculateResponse,
  CaseStudyDetail,
  CaseStudyFilters,
  CaseStudiesListResponse,
  ExampleDetail,
  ExampleFilters,
  ExamplesListResponse,
  FrameworkResponse,
  StepDetail,
  StepNumber,
} from '../types/content.types';
import type {
  WorksheetCode,
  WorksheetDraftResponse,
  WorksheetExportFormat,
  WorksheetHistoryResponse,
  WorksheetSaveDraftRequest,
  WorksheetSchema,
  WorksheetsListResponse,
  WorksheetSubmission,
} from '../types/worksheet.types';
import type {
  ActivityResponse,
  DashboardResponse,
  MilestonesResponse,
  ProfilePatch,
  ProgressResponse,
  RecommendationsResponse,
  ResetProgressResponse,
} from '../types/user.types';

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

  // Assessment endpoints
  async submit5q(data: SubmitLetterAssessmentRequest): Promise<StageAssessmentResult> {
    return this.apiRequest<StageAssessmentResult>('/assessments/5q', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submit10q(data: SubmitLetterAssessmentRequest): Promise<StageAssessmentResult> {
    return this.apiRequest<StageAssessmentResult>('/assessments/10q', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitGap(data: SubmitGapAssessmentRequest): Promise<GapAssessmentResult> {
    return this.apiRequest<GapAssessmentResult>('/assessments/gap-test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAssessmentHistory(): Promise<AssessmentHistoryResponse> {
    return this.apiRequest<AssessmentHistoryResponse>('/assessments/history');
  }

  async getAssessment(id: string): Promise<AssessmentDetail> {
    return this.apiRequest<AssessmentDetail>(`/assessments/${encodeURIComponent(id)}`);
  }

  // Content endpoints (Phase 3)
  async getFramework(): Promise<FrameworkResponse> {
    return this.apiRequest<FrameworkResponse>('/content/framework');
  }

  async getStep(stepNumber: StepNumber): Promise<StepDetail> {
    return this.apiRequest<StepDetail>(
      `/content/steps/${encodeURIComponent(stepNumber)}`
    );
  }

  async listExamples(filters: ExampleFilters = {}): Promise<ExamplesListResponse> {
    const query = buildQuery(filters);
    return this.apiRequest<ExamplesListResponse>(`/content/examples${query}`);
  }

  async getExample(code: string): Promise<ExampleDetail> {
    return this.apiRequest<ExampleDetail>(
      `/content/examples/${encodeURIComponent(code)}`
    );
  }

  async calculateExample(code: string, inputs: CalculateInputs): Promise<CalculateResponse> {
    return this.apiRequest<CalculateResponse>(
      `/content/examples/${encodeURIComponent(code)}/calculate`,
      { method: 'POST', body: JSON.stringify(inputs) }
    );
  }

  async listCaseStudies(filters: CaseStudyFilters = {}): Promise<CaseStudiesListResponse> {
    const query = buildQuery(filters);
    return this.apiRequest<CaseStudiesListResponse>(`/content/case-studies${query}`);
  }

  async getCaseStudy(code: string): Promise<CaseStudyDetail> {
    return this.apiRequest<CaseStudyDetail>(
      `/content/case-studies/${encodeURIComponent(code)}`
    );
  }

  // Worksheet endpoints (Phase 4)
  async listWorksheets(): Promise<WorksheetsListResponse> {
    return this.apiRequest<WorksheetsListResponse>('/worksheets');
  }

  async getWorksheetSchema(code: WorksheetCode): Promise<WorksheetSchema> {
    return this.apiRequest<WorksheetSchema>(
      `/worksheets/${encodeURIComponent(code)}`
    );
  }

  async saveWorksheetDraft(
    code: WorksheetCode,
    body: WorksheetSaveDraftRequest
  ): Promise<WorksheetDraftResponse> {
    return this.apiRequest<WorksheetDraftResponse>(
      `/worksheets/${encodeURIComponent(code)}/draft`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  }

  async submitWorksheet(
    code: WorksheetCode,
    body: WorksheetSaveDraftRequest
  ): Promise<WorksheetSubmission> {
    return this.apiRequest<WorksheetSubmission>(
      `/worksheets/${encodeURIComponent(code)}/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  }

  async getWorksheetLatest(code: WorksheetCode): Promise<WorksheetSubmission | null> {
    // The endpoint returns 204 when the user has nothing for this worksheet;
    // apiRequest hands back undefined; normalise to null for downstream code.
    const v = await this.apiRequest<WorksheetSubmission | undefined>(
      `/worksheets/${encodeURIComponent(code)}/latest`
    );
    return v ?? null;
  }

  async getWorksheetHistory(code: WorksheetCode): Promise<WorksheetHistoryResponse> {
    return this.apiRequest<WorksheetHistoryResponse>(
      `/worksheets/${encodeURIComponent(code)}/history`
    );
  }

  // Owner-only fetch-by-id (under /submissions/ to disambiguate from
  // {worksheet_code} routes). Returns null on 404 so the results page can
  // render a friendly fallback for stale links.
  async getWorksheetSubmission(
    worksheetId: string
  ): Promise<WorksheetSubmission | null> {
    try {
      return await this.apiRequest<WorksheetSubmission>(
        `/worksheets/submissions/${encodeURIComponent(worksheetId)}`
      );
    } catch (err) {
      const apiErr = err as { status?: number };
      if (apiErr.status === 404) return null;
      throw err;
    }
  }

  // Returns the file as a Blob. Caller is responsible for triggering the
  // browser download. Uses raw fetch so we can read response.blob() directly.
  async exportWorksheet(
    worksheetId: string,
    format: WorksheetExportFormat
  ): Promise<{ blob: Blob; filename: string }> {
    const url = `${this.baseURL}/worksheets/submissions/${encodeURIComponent(worksheetId)}/export/${encodeURIComponent(format)}`;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw await this.parseError(response);
    }
    const blob = await response.blob();
    // Pull the filename from Content-Disposition when present, otherwise
    // synthesise a reasonable default.
    const dispo = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(dispo);
    const filename = match
      ? decodeURIComponent(match[1].trim())
      : `worksheet-${worksheetId}.${format}`;
    return { blob, filename };
  }

  // User endpoints (Phase 5)
  async updateProfile(patch: ProfilePatch): Promise<ProfileResponse> {
    return this.apiRequest<ProfileResponse>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async getDashboard(): Promise<DashboardResponse> {
    return this.apiRequest<DashboardResponse>('/users/dashboard');
  }

  async getRecommendations(): Promise<RecommendationsResponse> {
    return this.apiRequest<RecommendationsResponse>('/users/recommendations');
  }

  async getUserProgress(): Promise<ProgressResponse> {
    return this.apiRequest<ProgressResponse>('/users/progress');
  }

  async setStepComplete(stepNumber: StepNumber): Promise<ProgressResponse> {
    return this.apiRequest<ProgressResponse>(
      `/users/progress/steps/${encodeURIComponent(stepNumber)}/complete`,
      { method: 'POST' }
    );
  }

  async setStepIncomplete(stepNumber: StepNumber): Promise<ProgressResponse> {
    return this.apiRequest<ProgressResponse>(
      `/users/progress/steps/${encodeURIComponent(stepNumber)}/incomplete`,
      { method: 'POST' }
    );
  }

  async getActivity(cursor?: string, limit?: number): Promise<ActivityResponse> {
    const query = buildQuery({ cursor, limit });
    return this.apiRequest<ActivityResponse>(`/users/activity${query}`);
  }

  async getMilestones(): Promise<MilestonesResponse> {
    return this.apiRequest<MilestonesResponse>('/users/milestones');
  }

  // Account utilities (Phase 6b). Backend requires the `confirm` field;
  // value is ignored but presence prevents accidental resets.
  async resetProgress(): Promise<ResetProgressResponse> {
    return this.apiRequest<ResetProgressResponse>('/users/me/reset-progress', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET' }),
    });
  }
}

const buildQuery = (filters: object): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const apiClient = new ApiClient(API_BASE_URL);
