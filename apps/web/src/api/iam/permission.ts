import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { CreatePermissionRequest, Permission, UpdatePermissionRequest } from './types';

export const permissionApi = {
  listPermissions: async (): Promise<ApiResponse<Permission[]>> => {
    // 平台管理员得到全量，租户管理员只得到自身可授予集合；避免租户侧调用
    // 平台专属的 /permissions 被 403 后角色授权抽屉不可用。
    return apiClient.iam.get<Permission[]>('/permissions/grantable');
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
