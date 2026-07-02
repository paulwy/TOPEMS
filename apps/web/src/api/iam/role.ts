import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Permission, Role, UpdateRoleRequest } from './types';

export const roleApi = {
  listRoles: async (): Promise<ApiResponse<Role[]>> => {
    return apiClient.iam.get<Role[]>('/roles');
  },

  getRole: async (id: string): Promise<ApiResponse<Role>> => {
    return apiClient.iam.get<Role>(`/roles/${id}`);
  },

  createRole: async (data: { name: string; description?: string }): Promise<ApiResponse<Role>> => {
    return apiClient.iam.post<Role>('/roles', data);
  },

  updateRole: async (roleId: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> => {
    return apiClient.iam.put<Role>(`/roles/${roleId}`, data);
  },

  deleteRole: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/roles/${id}`);
  },

  getRolePermissions: async (roleId: string): Promise<ApiResponse<Permission[]>> => {
    return apiClient.iam.get<Permission[]>(`/roles/${roleId}/permissions`);
  },

  addRolePermission: async (roleId: string, permissionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>(`/roles/${roleId}/permissions`, {
      permission_ids: [permissionId],
    });
  },

  removeRolePermission: async (
    roleId: string,
    permissionId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/roles/${roleId}/permissions/${permissionId}`);
  },
};

export default roleApi;
