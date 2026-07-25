import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AuthTokens,
  LoginResponseData,
  RefreshTokenResponseData,
  ResetPasswordRequest,
  SetNewPasswordRequest,
  User,
} from './types';

export const authModuleApi = {
  register: async (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<ApiResponse<AuthTokens>> => {
    return apiClient.iam.post<AuthTokens>('/auth/register', data);
  },

  login: async (data: { username: string; password: string }): Promise<ApiResponse<LoginResponseData>> => {
    const response = await apiClient.iam.post<LoginResponseData>('/auth/login', data);

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.access_token);
      apiClient.setAuthToken(response.data.access_token);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.iam.post('/auth/logout');
    } catch (error) {
      // Backend logout failed; continue with local cleanup
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    apiClient.clearAuthToken();
  },

  refreshToken: async (token: string): Promise<ApiResponse<RefreshTokenResponseData>> => {
    const response = await apiClient.iam.post<RefreshTokenResponseData>('/auth/refresh', {
      refresh_token: token,
    });

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.access_token);
    }

    return response;
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.iam.get<string>('/health');
  },

  requestPasswordReset: async (data: ResetPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/auth/forgot-password', data);
  },

  confirmPasswordReset: async (data: SetNewPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/auth/reset-password', data);
  },

  getPasswordPolicy: async (): Promise<
    ApiResponse<{
      min_length: number;
      require_uppercase: boolean;
      require_lowercase: boolean;
      require_numbers: boolean;
      require_special: boolean;
      max_age_days: number;
      prevent_reuse: number;
    }>
  > => {
    return apiClient.iam.get('/auth/password-policy');
  },

  updatePasswordPolicy: async (data: {
    min_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_special?: boolean;
    max_age_days?: number;
    prevent_reuse?: number;
  }): Promise<ApiResponse<{ updated: boolean }>> => {
    return apiClient.iam.put<{ updated: boolean }>('/auth/password-policy', data);
  },

  getActiveSessions: async (): Promise<
    ApiResponse<{
      sessions: Array<{
        id: string;
        ip_address: string;
        user_agent: string;
        created_at: string;
        expires_at: string;
        is_current: boolean;
      }>;
      total: number;
    }>
  > => {
    return apiClient.iam.get('/auth/sessions');
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete(`/auth/sessions/${sessionId}`);
  },

  revokeAllOtherSessions: async (): Promise<ApiResponse<{ revoked_count: number }>> => {
    return apiClient.iam.post<{ revoked_count: number }>('/auth/sessions/revoke-all');
  },

  getSecuritySettings: async (): Promise<
    ApiResponse<{
      mfa_enabled: boolean;
      login_alerts: boolean;
      ip_whitelist: string[];
      session_timeout_minutes: number;
    }>
  > => {
    return apiClient.iam.get('/auth/security-settings');
  },

  updateSecuritySettings: async (data: {
    mfa_enabled?: boolean;
    login_alerts?: boolean;
    ip_whitelist?: string[];
    session_timeout_minutes?: number;
  }): Promise<ApiResponse<{ updated: boolean }>> => {
    return apiClient.iam.put<{ updated: boolean }>('/auth/security-settings', data);
  },
};

export default authModuleApi;
