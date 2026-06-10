import apiClient from './client';
import type { ApiResponse } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  created_at: string;
  is_active: boolean;
  is_superuser?: boolean;
  avatar_url?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UserPreferences {
  notification_settings: NotificationSettings;
  shortcuts: ShortcutItem[];
  language: string;
  timezone: string;
}

export interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

export interface ShortcutItem {
  id: string;
  title: string;
  path: string;
}

export interface UserWithPermissions {
  user: User;
  roles: Role[];
  permissions: Permission[];
}

export interface PermissionCheckRequest {
  permission: string;
}

export interface PermissionCheckResponse {
  allowed: boolean;
  permission: string;
  user_id: string;
  username: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface CreateAccessLogRequest {
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
}

export interface CreatePermissionRequest {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  is_active?: boolean;
}

export const authApi = {
  register: async (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<ApiResponse<AuthTokens>> => {
    return apiClient.iam.post<AuthTokens>('/api/v1/auth/register', data);
  },

  login: async (data: { username: string; password: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.iam.post<any>('/api/v1/auth/login', data);

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.access_token);
      apiClient.setAuthToken(response.data.access_token);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    apiClient.clearAuthToken();
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.iam.get<User>('/api/v1/users/me');
  },

  getMyPermissions: async (): Promise<ApiResponse<UserWithPermissions>> => {
    return apiClient.iam.get<UserWithPermissions>('/api/v1/users/me/permissions');
  },

  checkPermission: async (permission: string): Promise<ApiResponse<PermissionCheckResponse>> => {
    return apiClient.iam.post<PermissionCheckResponse>('/api/v1/users/me/permissions/check', { permission });
  },

  refreshToken: async (token: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.iam.post<any>('/api/v1/auth/refresh', { refresh_token: token });

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.access_token);
    }

    return response;
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.iam.get<string>('/health');
  },

  listRoles: async (): Promise<ApiResponse<Role[]>> => {
    return apiClient.iam.get<Role[]>('/api/v1/roles');
  },

  getRole: async (id: string): Promise<ApiResponse<Role>> => {
    return apiClient.iam.get<Role>(`/api/v1/roles/${id}`);
  },

  createRole: async (data: { name: string; description?: string }): Promise<ApiResponse<Role>> => {
    return apiClient.iam.post<Role>('/api/v1/roles', data);
  },

  updateRole: async (roleId: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> => {
    return apiClient.iam.put<Role>(`/api/v1/roles/${roleId}`, data);
  },

  deleteRole: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/api/v1/roles/${id}`);
  },

  getRolePermissions: async (roleId: string): Promise<ApiResponse<Permission[]>> => {
    return apiClient.iam.get<Permission[]>(`/api/v1/roles/${roleId}/permissions`);
  },

  addRolePermission: async (roleId: string, permissionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>(`/api/v1/roles/${roleId}/permissions/${permissionId}`);
  },

  removeRolePermission: async (roleId: string, permissionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/api/v1/roles/${roleId}/permissions/${permissionId}`);
  },

  listPermissions: async (): Promise<ApiResponse<Permission[]>> => {
    return apiClient.iam.get<Permission[]>('/api/v1/permissions');
  },

  createPermission: async (data: CreatePermissionRequest): Promise<ApiResponse<Permission>> => {
    return apiClient.iam.post<Permission>('/api/v1/permissions', data);
  },

  updatePermission: async (permissionId: string, data: UpdatePermissionRequest): Promise<ApiResponse<Permission>> => {
    return apiClient.iam.put<Permission>(`/api/v1/permissions/${permissionId}`, data);
  },

  deletePermission: async (permissionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/api/v1/permissions/${permissionId}`);
  },

  getUserPermissions: async (userId: string): Promise<ApiResponse<UserWithPermissions>> => {
    return apiClient.iam.get<UserWithPermissions>(`/api/v1/users/${userId}/permissions`);
  },

  getUserRoles: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiClient.iam.get<any[]>(`/api/v1/users/${userId}/roles`);
  },

  addUserRole: async (userId: string, roleId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>(`/api/v1/users/${userId}/roles/${roleId}`);
  },

  removeUserRole: async (userId: string, roleId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/api/v1/users/${userId}/roles/${roleId}`);
  },

  listAccessLogs: async (limit?: number, offset?: number): Promise<ApiResponse<AccessLog[]>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiClient.iam.get<AccessLog[]>(`/api/v1/access-logs?${params}`);
  },

  getUserAccessLogs: async (userId: string, limit?: number, offset?: number): Promise<ApiResponse<AccessLog[]>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return apiClient.iam.get<AccessLog[]>(`/api/v1/access-logs/user/${userId}?${params}`);
  },

  createAccessLog: async (data: CreateAccessLogRequest): Promise<ApiResponse<AccessLog>> => {
    return apiClient.iam.post<AccessLog>('/api/v1/access-logs', data);
  },

  listUsers: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    return apiClient.iam.get<{ users: User[]; total: number }>(`/api/v1/users?${queryParams}`);
  },

  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    return apiClient.iam.get<User>(`/api/v1/users/${userId}`);
  },

  updateUser: async (userId: string, data: UpdateUserRequest): Promise<ApiResponse<User>> => {
    return apiClient.iam.put<User>(`/api/v1/users/${userId}`, data);
  },

  updateCurrentUser: async (data: { full_name?: string; email?: string }): Promise<ApiResponse<User>> => {
    return apiClient.iam.put<User>('/api/v1/users/me', data);
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/api/v1/users/me/password', data);
  },

  updateAvatar: async (data: { avatar_url: string }): Promise<ApiResponse<User>> => {
    return apiClient.iam.post<User>('/api/v1/users/me/avatar', data);
  },

  getPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.iam.get<UserPreferences>('/api/v1/users/me/preferences');
  },

  updatePreferences: async (data: {
    notification_settings?: NotificationSettings;
    shortcuts?: ShortcutItem[];
    language?: string;
    timezone?: string;
  }): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.iam.put<UserPreferences>('/api/v1/users/me/preferences', data);
  },

  deleteUser: async (userId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete<string>(`/api/v1/users/${userId}`);
  },

  createUser: async (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<ApiResponse<User>> => {
    return apiClient.iam.post<User>('/api/v1/users', data);
  },
};
