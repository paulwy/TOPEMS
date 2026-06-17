import { createRequest } from '@topems/shared-utils';
import type { Department, Position, User, PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/core/api/iam');

export const orgApi = {
  getUsers: async (params?: { page?: number; pageSize?: number; keyword?: string }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: Partial<User>): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get('/departments');
    return response.data;
  },

  getDepartment: async (id: string): Promise<Department> => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  createDepartment: async (data: Partial<Department>): Promise<Department> => {
    const response = await api.post('/departments', data);
    return response.data;
  },

  updateDepartment: async (id: string, data: Partial<Department>): Promise<Department> => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  getPositions: async (departmentId?: string): Promise<Position[]> => {
    const response = await api.get('/positions', { params: { departmentId } });
    return response.data;
  },

  createPosition: async (data: Partial<Position>): Promise<Position> => {
    const response = await api.post('/positions', data);
    return response.data;
  },

  updatePosition: async (id: string, data: Partial<Position>): Promise<Position> => {
    const response = await api.put(`/positions/${id}`, data);
    return response.data;
  },

  deletePosition: async (id: string): Promise<void> => {
    await api.delete(`/positions/${id}`);
  },
};
