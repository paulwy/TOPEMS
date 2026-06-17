import { createRequest } from '@topems/shared-utils';
import type { LoginRequest, LoginResponse, User } from '@topems/shared-types';

const api = createRequest('/api/v1/auth');

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/logout');
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await api.post('/refresh', { refreshToken });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/me');
    return response.data;
  },
};
