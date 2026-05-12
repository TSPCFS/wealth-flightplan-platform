// API Types based on API Contract

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  household_income_monthly_after_tax?: number;
  household_size?: number;
  number_of_dependants?: number;
  subscription_tier: string;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  household_income_monthly_after_tax?: number;
  household_size?: number;
  number_of_dependants?: number;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  email_verified: false;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface VerifyResponse {
  email_verified: true;
  message: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export interface ProfileResponse extends User {}