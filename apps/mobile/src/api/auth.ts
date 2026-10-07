import axios from 'axios';
import { storage } from '@/utils/storage';
import { getApiBaseUrl } from '@/utils/api-url';
import type { LoginCredentials, User, ApiResponse } from '@/types';

// FE-17：auth 走 core iam（/api/core/iam/auth/*），与 mobile business（C4，/api/mobile/*）同源不同前缀。
// 统一为「baseURL 带服务前缀 + 短路径」约定（与 C4 一致）：baseURL=origin+/api/core/iam，路径只写 /auth/*。
// 最终 URL 与旧版完全一致（origin/api/core/iam/auth/login），但消除了「origin-only baseURL + 手写全路径」的混乱。
// 注意：auth 不属于 /api/mobile，不能套用 C4 的 /api/mobile 后缀（svc/mobile 无 auth 路由）。
const AUTH_BASE_URL = `${getApiBaseUrl()}/api/core/iam`;

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
    const response = await authClient.post('/auth/login', credentials);
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
    const response = await authClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await authClient.post('/auth/refresh');
    const data = response.data;
    if (data.success && data.data && data.data.access_token) {
      await storage.setToken(data.data.access_token);
    }
    return data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const token = await storage.getToken();
    const response = await authClient.get('/auth/profile', {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    return response.data;
  },
};
