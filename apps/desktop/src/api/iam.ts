import apiClient from './client';
import type { LoginRequest } from '@topems/shared-types';

// LoginRequest 与 @topems/shared-types 字段完全一致（username + password），
// 复用共享包定义并薄壳 re-export，删除本地重复声明。
export type { LoginRequest };

// 本地保留：共享包 LoginResponse 要求 refreshToken/expiresIn 且 user 为完整 User，
// 与 desktop 登录接口实际返回形状（仅 token + user）不一致，见交付说明。
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

// 本地保留：共享包 User 强制要求 realName/status/permissions/createdAt/updatedAt，
// 且 role 为可选；desktop /users/me 与 mock 仅提供最小字段集且 role 为必填。
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

export const iamApi = {
  login: (data: LoginRequest) => apiClient.post('/api/core/iam/auth/login', data),
  getUserInfo: () => apiClient.get<UserInfo>('/api/core/iam/users/me'),
  logout: () => apiClient.post('/api/core/iam/auth/logout'),
};