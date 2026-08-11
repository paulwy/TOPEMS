import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type SnapshotType = 'full' | 'incremental' | 'differential';

export interface VersionSnapshot {
  id: string;
  entity_type: string;
  entity_id: string;
  version: string;
  snapshot_type: SnapshotType;
  created_at: string;
  created_by: string;
  size_bytes: number;
  metadata?: Record<string, unknown>;
}

export interface VersionHistoryEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  version: string;
  action: 'create' | 'update' | 'restore' | 'merge';
  changed_by: string;
  changed_at: string;
  summary?: string;
}

export interface VersionDiff {
  entity_type: string;
  entity_id: string;
  from_version: string;
  to_version: string;
  additions: number;
  deletions: number;
  modifications: number;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
}

export interface VersionBranch {
  id: string;
  name: string;
  parent_version: string;
  created_at: string;
  created_by: string;
  status: 'active' | 'merged' | 'abandoned';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
}

export interface Permission {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id?: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  granted_at: string;
  granted_by?: string;
  expires_at?: string;
}

export interface UserPermissions {
  user_id: string;
  permissions: Permission[];
  roles: Array<{ id: string; name: string }>;
}

export interface ComplianceAudit {
  entity_type: string;
  entity_id: string;
  total_changes: number;
  retained_days: number;
  retention_policy: string;
  last_audit_at?: string;
  compliance_status: 'compliant' | 'warning' | 'non_compliant';
  violations: Array<{ type: string; detail: string; severity: 'low' | 'medium' | 'high' }>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Array<{ resource: string; actions: string[] }>;
  created_at: string;
}

// ============ Request Types ============

export interface CreateSnapshotRequest {
  entity_type: string;
  entity_id: string;
  snapshot_type?: SnapshotType;
  note?: string;
}

export interface DiffVersionsParams {
  entity_type: string;
  entity_id: string;
  from_version: string;
  to_version: string;
}

export interface RestoreVersionRequest {
  entity_type: string;
  entity_id: string;
  version: string;
  note?: string;
}

export interface CreateBranchRequest {
  name: string;
  entity_type: string;
  entity_id: string;
  source_version: string;
}

export interface MergeBranchRequest {
  branch_id: string;
  target_version: string;
  strategy: 'auto' | 'manual' | 'ours' | 'theirs';
}

export interface GrantPermissionRequest {
  user_id: string;
  resource_type: string;
  resource_id?: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  expires_at?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: Array<{ resource: string; actions: string[] }>;
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
}

export interface QueryAuditParams {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ============ API ============

export const versioningApi = {
  // ===== 版本管理 =====
  async createSnapshot(data: CreateSnapshotRequest): Promise<ApiResponse<VersionSnapshot>> {
    return apiClient.master.post<VersionSnapshot>('/mdm-v54/version/snapshot', data);
  },

  async getVersion(entityType: string, entityId: string, params?: { version?: string }): Promise<ApiResponse<VersionSnapshot>> {
    const qs = new URLSearchParams();
    if (params?.version) qs.set('version', params.version);
    const s = qs.toString();
    return apiClient.master.get<VersionSnapshot>(`/mdm-v54/version/${entityType}/${entityId}${s ? `?${s}` : ''}`);
  },

  async diffVersions(params: DiffVersionsParams): Promise<ApiResponse<VersionDiff>> {
    const qs = new URLSearchParams();
    qs.set('entity_type', params.entity_type);
    qs.set('entity_id', params.entity_id);
    qs.set('from', params.from_version);
    qs.set('to', params.to_version);
    return apiClient.master.get<VersionDiff>(`/mdm-v54/version/diff?${qs.toString()}`);
  },

  async restoreVersion(data: RestoreVersionRequest): Promise<ApiResponse<VersionSnapshot>> {
    return apiClient.master.post<VersionSnapshot>('/mdm-v54/version/restore', data);
  },

  async listHistory(entityType: string, entityId: string, params?: { page?: number; pageSize?: number; action?: string }): Promise<ApiResponse<{ items: VersionHistoryEntry[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    if (params?.action) qs.set('action', params.action);
    const s = qs.toString();
    return apiClient.master.get<{ items: VersionHistoryEntry[]; total: number }>(
      `/mdm-v54/version/history/${entityType}/${entityId}${s ? `?${s}` : ''}`
    );
  },

  async createBranch(data: CreateBranchRequest): Promise<ApiResponse<VersionBranch>> {
    return apiClient.master.post<VersionBranch>('/mdm-v54/version/branch', data);
  },

  async mergeBranch(data: MergeBranchRequest): Promise<ApiResponse<VersionSnapshot>> {
    return apiClient.master.post<VersionSnapshot>('/mdm-v54/version/merge', data);
  },

  // ===== 审计日志 =====
  async queryAuditLog(params?: QueryAuditParams): Promise<ApiResponse<{ items: AuditLogEntry[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.entity_id) qs.set('entity_id', params.entity_id);
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: AuditLogEntry[]; total: number }>(`/mdm-v54/audit/log${s ? `?${s}` : ''}`);
  },

  async getUserActivity(userId: string, params?: { days?: number }): Promise<ApiResponse<AuditLogEntry[]>> {
    const qs = new URLSearchParams();
    if (params?.days !== undefined) qs.set('days', String(params.days));
    const s = qs.toString();
    return apiClient.master.get<AuditLogEntry[]>(`/mdm-v54/audit/user/${userId}${s ? `?${s}` : ''}`);
  },

  async getEntityHistory(entityType: string, entityId: string): Promise<ApiResponse<AuditLogEntry[]>> {
    return apiClient.master.get<AuditLogEntry[]>(`/mdm-v54/audit/entity/${entityType}/${entityId}`);
  },

  async exportAuditLog(params?: { format?: 'json' | 'csv'; from?: string; to?: string }): Promise<ApiResponse<{ job_id: string; download_url?: string }>> {
    return apiClient.master.post<{ job_id: string; download_url?: string }>('/mdm-v54/audit/export', params || {});
  },

  async getComplianceAudit(entityType: string, entityId: string): Promise<ApiResponse<ComplianceAudit>> {
    return apiClient.master.get<ComplianceAudit>(`/mdm-v54/audit/compliance?entity_type=${entityType}&entity_id=${entityId}`);
  },

  // ===== 权限管理 =====
  async grantPermission(data: GrantPermissionRequest): Promise<ApiResponse<Permission>> {
    return apiClient.master.post<Permission>('/mdm-v54/permissions/grant', data);
  },

  async revokePermission(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.delete<{ success: boolean }>(`/mdm-v54/permissions/${id}`);
  },

  async checkPermission(params: { user_id: string; resource_type: string; resource_id?: string; action?: string }): Promise<ApiResponse<{ allowed: boolean; reason?: string }>> {
    const qs = new URLSearchParams();
    qs.set('user_id', params.user_id);
    qs.set('resource_type', params.resource_type);
    if (params.resource_id) qs.set('resource_id', params.resource_id);
    if (params.action) qs.set('action', params.action);
    return apiClient.master.get<{ allowed: boolean; reason?: string }>(`/mdm-v54/permissions/check?${qs.toString()}`);
  },

  async getUserPermissions(userId: string): Promise<ApiResponse<UserPermissions>> {
    return apiClient.master.get<UserPermissions>(`/mdm-v54/permissions/user/${userId}`);
  },

  async getResourcePermissions(params?: { resource_type?: string; resource_id?: string }): Promise<ApiResponse<Permission[]>> {
    const qs = new URLSearchParams();
    if (params?.resource_type) qs.set('resource_type', params.resource_type);
    if (params?.resource_id) qs.set('resource_id', params.resource_id);
    const s = qs.toString();
    return apiClient.master.get<Permission[]>(`/mdm-v54/permissions/resource${s ? `?${s}` : ''}`);
  },

  // ===== 角色管理 =====
  async createRole(data: CreateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.master.post<Role>('/mdm-v54/roles', data);
  },

  async assignRole(data: AssignRoleRequest): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.post<{ success: boolean }>('/mdm-v54/roles/assign', data);
  },

  async revokeRole(data: AssignRoleRequest): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.delete<{ success: boolean }>('/mdm-v54/roles/revoke', { data });
  },
};

export default versioningApi;
