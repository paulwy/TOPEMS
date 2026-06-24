import { createRequest } from '@topems/shared-utils';
import type { User, Role, Permission, PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/api/iam');

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  realName?: string;
}

export interface UpdateUserRequest {
  email?: string;
  realName?: string;
  status?: 'active' | 'inactive' | 'locked';
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface CreatePermissionRequest {
  name: string;
  code: string;
  type: 'menu' | 'button' | 'api';
  resource?: string;
  action?: string;
}

export const iamApi = {
  listUsers: async (params?: ListUsersParams): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  getUserRoles: async (userId: string): Promise<Role[]> => {
    const response = await api.get(`/users/${userId}/roles`);
    return response.data;
  },

  addUserRole: async (userId: string, roleId: string): Promise<void> => {
    await api.post(`/users/${userId}/roles/${roleId}`);
  },

  removeUserRole: async (userId: string, roleId: string): Promise<void> => {
    await api.delete(`/users/${userId}/roles/${roleId}`);
  },

  listRoles: async (): Promise<Role[]> => {
    const response = await api.get('/roles');
    return response.data;
  },

  getRole: async (id: string): Promise<Role> => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await api.post('/roles', data);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  getRolePermissions: async (roleId: string): Promise<Permission[]> => {
    const response = await api.get(`/roles/${roleId}/permissions`);
    return response.data;
  },

  addRolePermission: async (roleId: string, permissionId: string): Promise<void> => {
    await api.post(`/roles/${roleId}/permissions`, { permissionIds: [permissionId] });
  },

  removeRolePermission: async (roleId: string, permissionId: string): Promise<void> => {
    await api.delete(`/roles/${roleId}/permissions/${permissionId}`);
  },

  listPermissions: async (): Promise<Permission[]> => {
    const response = await api.get('/permissions');
    return response.data;
  },

  createPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await api.post('/permissions', data);
    return response.data;
  },

  deletePermission: async (id: string): Promise<void> => {
    await api.delete(`/permissions/${id}`);
  },
};
