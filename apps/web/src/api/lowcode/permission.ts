import type {
  RolePermission,
  DataPermissionRule,
  FieldPermissionRule,
} from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const listRolePermissions = async (
  appId: string
): Promise<ApiResponse<RolePermission[]>> => {
  return apiClient.core.get(`/lowcode/apps/${appId}/permissions/roles`);
};

export const getRolePermission = async (
  appId: string,
  roleId: string
): Promise<ApiResponse<RolePermission>> => {
  return apiClient.core.get(`/lowcode/apps/${appId}/permissions/roles/${roleId}`);
};

export const updateRolePermissions = async (
  appId: string,
  roleId: string,
  permissions: Partial<RolePermission>
): Promise<ApiResponse<RolePermission>> => {
  return apiClient.core.put(
    `/lowcode/apps/${appId}/permissions/roles/${roleId}`,
    permissions
  );
};

export const listDataPermissions = async (
  appId: string,
  modelId?: string
): Promise<ApiResponse<DataPermissionRule[]>> => {
  const query = modelId ? `?model_id=${modelId}` : '';
  return apiClient.core.get(`/lowcode/apps/${appId}/permissions/data${query}`);
};

export const listFieldPermissions = async (
  appId: string,
  modelId?: string
): Promise<ApiResponse<FieldPermissionRule[]>> => {
  const query = modelId ? `?model_id=${modelId}` : '';
  return apiClient.core.get(`/lowcode/apps/${appId}/permissions/fields${query}`);
};

export const updateFieldPermission = async (
  appId: string,
  permissionId: string,
  data: Partial<FieldPermissionRule>
): Promise<ApiResponse<FieldPermissionRule>> => {
  return apiClient.core.put(
    `/lowcode/apps/${appId}/permissions/fields/${permissionId}`,
    data
  );
};

export const permissionApi = {
  listRolePermissions,
  getRolePermission,
  updateRolePermissions,
  listDataPermissions,
  listFieldPermissions,
  updateFieldPermission,
};
