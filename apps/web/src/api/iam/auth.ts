import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AuthTokens,
  LoginResponseData,
  RefreshTokenResponseData,
  ResetPasswordRequest,
  SetNewPasswordRequest,
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

  login: async (data: {
    username: string;
    password: string;
  }): Promise<ApiResponse<LoginResponseData>> => {
    const response = await apiClient.iam.post<LoginResponseData>('/auth/login', data);

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.access_token);
      apiClient.setAuthToken(response.data.access_token);
      // #18：refresh_token 不再写 localStorage——已由后端以 HttpOnly Cookie 下发，
      // 浏览器自动携带；仅清理迁移期可能残留的旧键。
      localStorage.removeItem('refresh_token');
    }

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      // #18：refresh_token 已入 HttpOnly Cookie——logout 无 body，Cookie 自动携带（后端 cookie 优先）
      await apiClient.iam.post('/auth/logout');
    } catch {
      // Backend logout failed; continue with local cleanup
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    apiClient.clearAuthToken();
  },

  refreshToken: async (token?: string): Promise<ApiResponse<RefreshTokenResponseData>> => {
    // #18：无 token 参数 → cookie 模式（HttpOnly Cookie 自动携带，后端 cookie 优先）；
    // 传 token → body 模式（后端双轨兼容：迁移期旧客户端 / 测试 / 其它端）
    const body = token ? { refresh_token: token } : undefined;
    const response = await apiClient.iam.post<RefreshTokenResponseData>('/auth/refresh', body);

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
};

export default authModuleApi;
