import apiClient from './client';
import type { ApiResponse } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authApi = {
  register: async (data: { username: string; email: string; password: string }) => {
    return apiClient.iam.post<ApiResponse<AuthTokens>>('/api/v1/auth/register', data);
  },

  login: async (data: { username: string; password: string }) => {
    return apiClient.iam.post<ApiResponse<AuthTokens>>('/api/v1/auth/login', data);
  },

  getCurrentUser: async () => {
    return apiClient.iam.get<ApiResponse<User>>('/api/v1/users/me');
  },

  health: async () => {
    return apiClient.iam.get<ApiResponse<string>>('/health');
  },
};
