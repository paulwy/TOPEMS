/**
 * Mobile · 用户资料 API 绑定
 *
 * 后端: svc/mobile/src/modules/user.rs
 * 路由（已注册 main.rs）:
 *   GET    /user/profile
 *   PUT    /user/profile
 *   POST   /user/avatar
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  /** 后端 GET /user/profile 实际下发字段（= IAM full_name） */
  nickname?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  locale?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  locale?: string;
  timezone?: string;
}

export interface UserSettings {
  language: string;
  theme: string;
  notification_enabled: boolean;
  sound_enabled: boolean;
  auto_sync: boolean;
  sync_interval: number;
  configured: boolean;
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    return apiClient.mobile.get('/user/profile');
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> => {
    return apiClient.mobile.put('/user/profile', data);
  },

  uploadAvatar: async (formData: FormData): Promise<ApiResponse<UserProfile>> => {
    return apiClient.mobile.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getSettings: async (): Promise<ApiResponse<UserSettings>> => {
    return apiClient.mobile.get('/user/settings');
  },

  updateSettings: async (data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> => {
    return apiClient.mobile.put('/user/settings', data);
  },
};

export default userApi;
