import apiClient from './client';
import type { LoginCredentials, User, ApiResponse } from '@/types';

export const authApi = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },
};
