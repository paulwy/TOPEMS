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
  code: string;
  category: string;
  description?: string;
  resource?: string;
  action?: string;
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

// 密码重置请求
export interface ResetPasswordRequest {
  email: string;
}

// 设置新密码请求
export interface SetNewPasswordRequest {
  token: string;
  new_password: string;
}

// 批量操作请求
export interface BatchOperationRequest {
  user_ids: string[];
}

// 批量删除响应
export interface BatchDeleteResponse {
  deleted_count: number;
  failed_ids: string[];
}

// 批量更新用户状态
export interface BatchUpdateUsersRequest {
  user_ids: string[];
  is_active?: boolean;
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
  code: string;
  category: string;
  module: string;
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
    return apiClient.iam.post<string>(`/api/v1/roles/${roleId}/permissions`, { permission_ids: [permissionId] });
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

  // 密码重置请求
  requestPasswordReset: async (data: ResetPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/api/v1/auth/reset-password', data);
  },

  // 确认密码重置（设置新密码）
  confirmPasswordReset: async (data: SetNewPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.iam.post<string>('/api/v1/auth/set-new-password', data);
  },

  // 获取用户有效权限（角色权限 + 直接权限）
  getEffectivePermissions: async (userId: string): Promise<ApiResponse<{
    direct_permissions: Permission[];
    role_permissions: Permission[];
    all_permissions: Permission[];
    total: number;
  }>> => {
    return apiClient.iam.get(`/api/v1/users/${userId}/effective-permissions`);
  },

  // 批量删除用户
  batchDeleteUsers: async (data: BatchOperationRequest): Promise<ApiResponse<BatchDeleteResponse>> => {
    return apiClient.iam.post<BatchDeleteResponse>('/api/v1/users/batch-delete', data);
  },

  // 批量更新用户状态
  batchUpdateUsers: async (data: BatchUpdateUsersRequest): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.iam.put<{ updated_count: number }>('/api/v1/users/batch-update', data);
  },

  // 验证邮箱是否可用
  checkEmailAvailability: async (email: string): Promise<ApiResponse<{ available: boolean }>> => {
    return apiClient.iam.get<{ available: boolean }>(`/api/v1/users/check-email?email=${encodeURIComponent(email)}`);
  },

  // 验证用户名是否可用
  checkUsernameAvailability: async (username: string): Promise<ApiResponse<{ available: boolean }>> => {
    return apiClient.iam.get<{ available: boolean }>(`/api/v1/users/check-username?username=${encodeURIComponent(username)}`);
  },

  // 获取密码策略
  getPasswordPolicy: async (): Promise<ApiResponse<{
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
    max_age_days: number;
    prevent_reuse: number;
  }>> => {
    return apiClient.iam.get('/api/v1/auth/password-policy');
  },

  // 更新密码策略
  updatePasswordPolicy: async (data: {
    min_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_special?: boolean;
    max_age_days?: number;
    prevent_reuse?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.iam.put('/api/v1/auth/password-policy', data);
  },

  // 获取用户登录历史
  getLoginHistory: async (userId: string, limit?: number): Promise<ApiResponse<{
    logs: Array<{
      id: string;
      ip_address: string;
      user_agent: string;
      success: boolean;
      created_at: string;
    }>;
    total: number;
  }>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.iam.get(`/api/v1/users/${userId}/login-history${params}`);
  },

  // 获取活跃会话列表
  getActiveSessions: async (): Promise<ApiResponse<{
    sessions: Array<{
      id: string;
      ip_address: string;
      user_agent: string;
      created_at: string;
      expires_at: string;
      is_current: boolean;
    }>;
    total: number;
  }>> => {
    return apiClient.iam.get('/api/v1/auth/sessions');
  },

  // 撤销会话
  revokeSession: async (sessionId: string): Promise<ApiResponse<string>> => {
    return apiClient.iam.delete(`/api/v1/auth/sessions/${sessionId}`);
  },

  // 撤销所有其他会话
  revokeAllOtherSessions: async (): Promise<ApiResponse<{ revoked_count: number }>> => {
    return apiClient.iam.post<{ revoked_count: number }>('/api/v1/auth/sessions/revoke-all');
  },

  // 获取安全设置
  getSecuritySettings: async (): Promise<ApiResponse<{
    mfa_enabled: boolean;
    login_alerts: boolean;
    ip_whitelist: string[];
    session_timeout_minutes: number;
  }>> => {
    return apiClient.iam.get('/api/v1/auth/security-settings');
  },

  // 更新安全设置
  updateSecuritySettings: async (data: {
    mfa_enabled?: boolean;
    login_alerts?: boolean;
    ip_whitelist?: string[];
    session_timeout_minutes?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.iam.put('/api/v1/auth/security-settings', data);
  },
};
