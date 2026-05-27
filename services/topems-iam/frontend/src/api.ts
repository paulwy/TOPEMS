import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/login', data);
    return response.data.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout');
  },
  validateToken: async (): Promise<User> => {
    const response = await api.get('/api/v1/auth/validate');
    return response.data.data;
  },
};

export const userApi = {
  list: async (): Promise<User[]> => {
    const response = await api.get('/api/v1/users');
    return response.data.data;
  },
};

export const permissionApi = {
  list: async (): Promise<Permission[]> => {
    const response = await api.get('/api/v1/permissions');
    return response.data.data;
  },
};

export const roleApi = {
  list: async (): Promise<Role[]> => {
    const response = await api.get('/api/v1/roles');
    return response.data.data;
  },
};

export default api;