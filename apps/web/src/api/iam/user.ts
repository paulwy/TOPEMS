import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AccessLog,
  BatchDeleteResponse,
  BatchOperationRequest,
  BatchUpdateUsersRequest,
  CreateAccessLogRequest,
  NotificationSettings,
  Permission,
  PermissionCheckResponse,
  Role,
  ShortcutItem,
  UpdateUserRequest,
  User,
  UserPreferences,
  UserWithPermissions,
} from './types';

export const userApi = {
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.iam.get<User>('/users/me');
  },

  getMyPermissions: async (): Promise<ApiResponse<UserWithPermissions>> => {
    return apiClient.iam.get<UserWithPermissions>('/users/me/permissions');
  },

  checkPermission: async (permission: string): Promise<ApiResponse<PermissionCheckResponse>> => {
    return apiClient.iam.post<PermissionCheckResponse>('/users/me/permissions/check', {
      permission,
    });
  },

  listUsers: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    return apiClient.iam.get<{ users: User[]; total: number }>(`/users?${queryParams}`);
  },

  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    return apiClient.iam.get<User>(`/users/${userId}`);
  },

  updateUser: async (userId: string, data: UpdateUserRequest): Promise<ApiResponse<User>> => {
    return apiClient.iam.put<User>(`/users/${userId}`, data);
  },

  updateCurrentUser: async (data: {
    full_name?: string;
    email?: string;
  }): Promise<ApiResponse<User>> => {
    return apiClient.iam.put<User>('/users/me', data);
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/users/me/password', data);
  },

  updateAvatar: async (data: { avatar_url: string }): Promise<ApiResponse<User>> => {
    return apiClient.iam.post<User>('/users/me/avatar', data);
  },

  getPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.iam.get<UserPreferences>('/users/me/preferences');
  },

  updatePreferences: async (data: {
    notification_settings?: NotificationSettings;
    shortcuts?: ShortcutItem[];
    language?: string;
    timezone?: string;
  }): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.iam.put<UserPreferences>('/users/me/preferences', data);
  },

  deleteUser: async (userId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/users/${userId}`);
  },

  createUser: async (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<ApiResponse<User>> => {
    return apiClient.iam.post<User>('/users', data);
  },

  getUserPermissions: async (userId: string): Promise<ApiResponse<UserWithPermissions>> => {
    return apiClient.iam.get<UserWithPermissions>(`/users/${userId}/permissions`);
  },

  getUserRoles: async (userId: string): Promise<ApiResponse<Role[]>> => {
    return apiClient.iam.get<Role[]>(`/users/${userId}/roles`);
  },

  addUserRole: async (userId: string, roleId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>(`/users/${userId}/roles/${roleId}`);
  },

  removeUserRole: async (userId: string, roleId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/users/${userId}/roles/${roleId}`);
  },

  getEffectivePermissions: async (
    userId: string
  ): Promise<
    ApiResponse<{
      direct_permissions: Permission[];
      role_permissions: Permission[];
      all_permissions: Permission[];
      total: number;
    }>
  > => {
    return apiClient.iam.get(`/users/${userId}/effective-permissions`);
  },

  batchDeleteUsers: async (
    data: BatchOperationRequest
  ): Promise<ApiResponse<BatchDeleteResponse>> => {
    return apiClient.iam.post<BatchDeleteResponse>('/users/batch-delete', data);
  },

  batchUpdateUsers: async (
    data: BatchUpdateUsersRequest
  ): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.iam.put<{ updated_count: number }>('/users/batch-update', data);
  },

  checkEmailAvailability: async (email: string): Promise<ApiResponse<{ available: boolean }>> => {
    return apiClient.iam.get<{ available: boolean }>(
      `/users/check-email?email=${encodeURIComponent(email)}`
    );
  },

  checkUsernameAvailability: async (
    username: string
  ): Promise<ApiResponse<{ available: boolean }>> => {
    return apiClient.iam.get<{ available: boolean }>(
      `/users/check-username?username=${encodeURIComponent(username)}`
    );
  },

  getLoginHistory: async (
    userId: string,
    limit?: number
  ): Promise<
    ApiResponse<{
      logs: Array<{
        id: string;
        ip_address: string;
        user_agent: string;
        success: boolean;
        created_at: string;
      }>;
      total: number;
    }>
  > => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.iam.get(`/users/${userId}/login-history${params}`);
  },

  listAccessLogs: async (limit?: number, offset?: number): Promise<ApiResponse<AccessLog[]>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiClient.iam.get<AccessLog[]>(`/access-logs?${params}`);
  },

  getUserAccessLogs: async (
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<AccessLog[]>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiClient.iam.get<AccessLog[]>(`/access-logs/user/${userId}?${params}`);
  },

  createAccessLog: async (data: CreateAccessLogRequest): Promise<ApiResponse<AccessLog>> => {
    return apiClient.iam.post<AccessLog>('/access-logs', data);
  },
};

export default userApi;
