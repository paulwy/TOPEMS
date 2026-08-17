import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface IamLoginRequest {
  email: string;
  password: string;
  mfa_code?: string;
  remember?: boolean;
}

export interface IamRegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface IamUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role?: string;
  status?: 'active' | 'disabled' | 'pending';
  created_at?: string;
}

export interface IamAuthResponse {
  token: string;
  refresh_token?: string;
  user: IamUser;
  expires_at?: string;
}

export const iamAuthApi = {
  login: (data: IamLoginRequest): Promise<ApiResponse<IamAuthResponse>> => {
    return apiClient.core.post('/iam/auth/login', data);
  },

  register: (data: IamRegisterRequest): Promise<ApiResponse<IamAuthResponse>> => {
    return apiClient.core.post('/iam/auth/register', data);
  },

  listUsers: (params?: {
    role?: string;
    status?: string;
    keyword?: string;
  }): Promise<ApiResponse<IamUser[]>> => {
    return apiClient.core.get('/users', { params });
  },

  createUser: (data: Partial<IamUser> & { password?: string }): Promise<ApiResponse<IamUser>> => {
    return apiClient.core.post('/users', data);
  },
};

export default iamAuthApi;
