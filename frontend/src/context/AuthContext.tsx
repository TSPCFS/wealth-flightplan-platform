import React, { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api';
import type {
  LoginRequest,
  LoginResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../types/api.types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  confirmPasswordReset: (
    data: PasswordResetConfirmRequest
  ) => Promise<PasswordResetConfirmResponse>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      try {
        // apiClient transparently refreshes on 401 if a refresh token is present.
        const profile = await userService.getProfile();
        if (cancelled) return;
        setUser(profile);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
        setStatus('unauthenticated');
      }
    };

    initializeAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback((data: RegisterRequest) => authService.register(data), []);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    setUser(response.user);
    setStatus('authenticated');
    return response;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authService.logout({ refresh_token: refreshToken });
      } catch {
        // Server-side blacklisting may fail; client-side teardown still proceeds.
      }
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => authService.requestPasswordReset({ email }),
    []
  );

  const confirmPasswordReset = useCallback(
    (data: PasswordResetConfirmRequest) => authService.confirmPasswordReset(data),
    []
  );

  const value: AuthContextType = {
    user,
    status,
    register,
    login,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
