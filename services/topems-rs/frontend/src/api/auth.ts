import { apiClient, ApiResponse } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const authApi = {
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post('/api/v1/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<ApiResponse<string>> {
    const response = await apiClient.post('/api/v1/auth/logout');
    return response.data;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string): void {
    localStorage.setItem('token', token);
  },

  removeToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};