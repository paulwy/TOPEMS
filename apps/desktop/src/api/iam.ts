import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

export const iamApi = {
  login: (data: LoginRequest) => apiClient.post('/api/core/iam/login', data),
  getUserInfo: () => apiClient.get<UserInfo>('/api/core/iam/users/me'),
  logout: () => apiClient.post('/api/core/iam/logout'),
};