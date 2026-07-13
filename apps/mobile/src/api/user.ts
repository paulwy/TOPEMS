import { apiClient } from './client';
import type { ApiResponse, User } from '@/types';

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    avatar?: string;
    phone?: string;
  }): Promise<ApiResponse<User>> => {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },

  changePassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> => {
    const response = await apiClient.post('/user/change-password', data);
    return response.data;
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  },

  getUsers: async (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    departmentId?: string;
    status?: string;
  }): Promise<ApiResponse<{ items: User[]; total: number }>> => {
    const response = await apiClient.get('/user', { params });
    return response.data;
  },

  getDepartmentMembers: async (departmentId: string): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get(`/user/department/${departmentId}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.put(`/user/${id}/status`, { status });
    return response.data;
  },

  getPermissions: async (): Promise<ApiResponse<{ permissions: string[]; roles: string[] }>> => {
    const response = await apiClient.get('/user/permissions');
    return response.data;
  },
};
