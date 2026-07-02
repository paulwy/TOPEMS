import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { CreatePermissionRequest, Permission, UpdatePermissionRequest } from './types';

export const permissionApi = {
  listPermissions: async (): Promise<ApiResponse<Permission[]>> => {
    return apiClient.iam.get<Permission[]>('/permissions');
  },

  createPermission: async (data: CreatePermissionRequest): Promise<ApiResponse<Permission>> => {
    return apiClient.iam.post<Permission>('/permissions', data);
  },

  updatePermission: async (
    permissionId: string,
    data: UpdatePermissionRequest
  ): Promise<ApiResponse<Permission>> => {
    return apiClient.iam.put<Permission>(`/permissions/${permissionId}`, data);
  },

  deletePermission: async (permissionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/permissions/${permissionId}`);
  },
};

export default permissionApi;
