import axios from 'axios';
import { storage } from '@/utils/storage';
import { getApiBaseUrl } from '@/utils/api-url';
import type { LoginCredentials, User, ApiResponse } from '@/types';

const AUTH_BASE_URL = getApiBaseUrl();

const authClient = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ApiResponse<{ user: User; token: string; access_token?: string }>> => {
    const response = await authClient.post('/api/core/iam/auth/login', credentials);
    const data = response.data;
    if (data.success && data.data) {
      const token = data.data.token || data.data.access_token;
      if (token) {
        await storage.setToken(token);
        await storage.setUser(data.data.user);
      }
    }
    return data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    await storage.removeToken();
    await storage.removeUser();
    const response = await authClient.post('/api/core/iam/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await authClient.post('/api/core/iam/auth/refresh');
    const data = response.data;
    if (data.success && data.data && data.data.access_token) {
      await storage.setToken(data.data.access_token);
    }
    return data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const token = await storage.getToken();
    const response = await authClient.get('/api/core/iam/auth/profile', {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    return response.data;
  },
};
