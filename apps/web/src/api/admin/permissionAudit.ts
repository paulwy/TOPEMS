import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PermissionChange {
  id: string;
  user_id: string;
  username: string;
  target_user_id?: string;
  target_user_name?: string;
  role_id?: string;
  role_name?: string;
  permission_id?: string;
  permission_name?: string;
  permission_code?: string;
  action: 'grant' | 'revoke' | 'update' | 'inherit';
  change_type: 'role' | 'permission' | 'group';
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  old_value?: string;
  new_value?: string;
  operator_id: string;
  operator_name: string;
  ip_address?: string;
  reason?: string;
  success: boolean;
  status?: string;
  error_message?: string;
  created_at: string;
}

interface PermissionAuditQueryParams {
  page?: number;
  page_size?: number;
  user_id?: string;
  role_id?: string;
  permission_id?: string;
  action?: string;
  change_type?: string;
  start_date?: string;
  end_date?: string;
  operator_id?: string;
  success?: boolean;
  search?: string;
  format?: string;
}

interface PaginatedPermissionChanges {
  items: PermissionChange[];
  total: number;
  page: number;
  page_size: number;
}

export interface PermissionChangeStats {
  total_changes: number;
  today_changes: number;
  role_changes: number;
  permission_changes: number;
  grants: number;
  revokes: number;
  updates: number;
  success_rate: number;
  by_role: Array<{ role_id: string; role_name: string; count: number }>;
  by_user: Array<{ user_id: string; username: string; count: number }>;
  by_operator: Array<{ operator_id: string; operator_name: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
}

export interface AccessControlLog {
  id: string;
  user_id: string;
  username: string;
  user_name?: string;
  resource: string;
  resource_path?: string;
  resource_id?: string;
  action: string;
  access_type?: string;
  requested_at: string;
  access_time?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  allowed: boolean;
  status?: string;
  response_time?: number;
  denied_reason?: string;
  matched_policy?: string;
  required_permission?: string;
  user_permissions?: string[];
  created_at: string;
}

interface AccessControlQueryParams {
  page?: number;
  page_size?: number;
  user_id?: string;
  resource?: string;
  action?: string;
  allowed?: boolean;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
  search?: string;
  format?: string;
}

interface PaginatedAccessLogs {
  items: AccessControlLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AccessControlStats {
  total_requests: number;
  total_access: number;
  today_access: number;
  login_count: number;
  denied_count: number;
  allowed_requests: number;
  denied_requests: number;
  deny_rate: number;
  top_resources: Array<{ resource: string; count: number; deny_count: number }>;
  top_users: Array<{ user_id: string; username: string; count: number; deny_count: number }>;
  top_denied_users: Array<{ user_id: string; username: string; deny_count: number }>;
  trend: Array<{ date: string; allowed: number; denied: number }>;
}

export const permissionAuditApi = {
  listPermissionChanges: async (
    params?: PermissionAuditQueryParams
  ): Promise<ApiResponse<PaginatedPermissionChanges>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.role_id) queryParams.append('role_id', params.role_id);
    if (params?.permission_id) queryParams.append('permission_id', params.permission_id);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.change_type) queryParams.append('change_type', params.change_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.operator_id) queryParams.append('operator_id', params.operator_id);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.core.get<PaginatedPermissionChanges>(
      `/audit/permission-changes?${queryParams.toString()}`
    );
  },

  getPermissionChange: async (id: string): Promise<ApiResponse<PermissionChange>> => {
    return apiClient.core.get<PermissionChange>(`/audit/permission-changes/${id}`);
  },

  getPermissionChangeStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PermissionChangeStats>> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.core.get<PermissionChangeStats>(
      `/audit/permission-changes/stats?${queryParams.toString()}`
    );
  },

  exportPermissionChanges: async (params?: PermissionAuditQueryParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.role_id) queryParams.append('role_id', params.role_id);
    if (params?.permission_id) queryParams.append('permission_id', params.permission_id);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.change_type) queryParams.append('change_type', params.change_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.operator_id) queryParams.append('operator_id', params.operator_id);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.core.get(
      `/audit/permission-changes/export?${queryParams.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data as unknown as Blob;
  },

  listAccessLogs: async (
    params?: AccessControlQueryParams
  ): Promise<ApiResponse<PaginatedAccessLogs>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.resource) queryParams.append('resource', params.resource);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.allowed !== undefined) queryParams.append('allowed', params.allowed.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.ip_address) queryParams.append('ip_address', params.ip_address);
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.core.get<PaginatedAccessLogs>(`/audit/access-logs?${queryParams.toString()}`);
  },

  getAccessLog: async (id: string): Promise<ApiResponse<AccessControlLog>> => {
    return apiClient.core.get<AccessControlLog>(`/audit/access-logs/${id}`);
  },

  getAccessControlStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<AccessControlStats>> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.core.get<AccessControlStats>(
      `/audit/access-logs/stats?${queryParams.toString()}`
    );
  },

  exportAccessLogs: async (params?: AccessControlQueryParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.resource) queryParams.append('resource', params.resource);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.allowed !== undefined) queryParams.append('allowed', params.allowed.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.ip_address) queryParams.append('ip_address', params.ip_address);
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.core.get(
      `/audit/access-logs/export?${queryParams.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data as unknown as Blob;
  },
};

export default permissionAuditApi;
