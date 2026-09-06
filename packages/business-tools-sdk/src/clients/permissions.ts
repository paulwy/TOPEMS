/** 权限子客户端（V0.1）：list/get/create/delete + 批量 + 校验 */

import type { HttpTransport } from '../transport.js';
import type {
  BatchResult,
  BulkPermissionRequest,
  BulkPermissionResult,
  PageParams,
  Paged,
  Permission,
  Role,
} from '../types.js';

export class PermissionsClient {
  constructor(private readonly http: HttpTransport) {}

  /** 分页列出权限 */
  listPermissions(params?: PageParams): Promise<Paged<Permission>> {
    return this.http.pagedGet<Permission>('/api/core/iam/permissions', params);
  }

  /** 分页列出角色（含权限数） */
  listRoles(params?: PageParams): Promise<Paged<Role>> {
    return this.http.pagedGet<Role>('/api/core/iam/roles', params);
  }

  /** 获取角色详情 */
  getRole(id: string): Promise<Role> {
    return this.http.request<Role>('GET', `/api/core/iam/roles/${encodeURIComponent(id)}`);
  }

  /** 校验当前用户是否具备权限 */
  verify(permission: string): Promise<{ has_permission: boolean; permission: string; message?: string | null }> {
    return this.http.request('POST', '/api/core/iam/permissions/verify', { permission });
  }

  /** 批量校验权限 */
  verifyMultiple(
    permissions: string[],
  ): Promise<{
    results: Array<{ has_permission: boolean; permission: string; message?: string | null }>;
    all_granted: boolean;
    any_granted: boolean;
  }> {
    return this.http.request('POST', '/api/core/iam/permissions/verify-multiple', { permissions });
  }

  /** 当前用户权限列表 */
  myPermissions(): Promise<Permission[]> {
    return this.http.request<Permission[]>('GET', '/api/core/iam/permissions/my-permissions');
  }

  /** 批量创建（事务语义，部分失败返回 BatchResult） */
  batchCreate(_items: Array<{ code: string; name: string; description?: string }>): Promise<BatchResult> {
    return this.http.request<BatchResult>('POST', '/api/core/iam/permissions/batch', { items: _items });
  }

  /** 批量删除（事务语义） */
  batchDelete(ids: string[]): Promise<BatchResult> {
    return this.http.request<BatchResult>('POST', '/api/core/iam/permissions/batch-delete', { ids });
  }

  /** 批量创建权限（V530f /permissions/bulk POST） */
  bulkCreate(request: BulkPermissionRequest): Promise<BulkPermissionResult> {
    return this.http.request<BulkPermissionResult>('POST', '/api/core/business-tools/permissions/bulk', request);
  }

  /** 批量更新权限（V530f /permissions/bulk PUT） */
  bulkUpdate(request: BulkPermissionRequest): Promise<BulkPermissionResult> {
    return this.http.request<BulkPermissionResult>('PUT', '/api/core/business-tools/permissions/bulk', request);
  }

  /** 批量删除权限（V530f /permissions/bulk DELETE） */
  bulkDelete(keys: Array<{ tenant_id: string; user_id: string }>): Promise<BulkPermissionResult> {
    return this.http.request<BulkPermissionResult>('DELETE', '/api/core/business-tools/permissions/bulk', { keys });
  }

  /** 导出权限（JSON/CSV，V530f CSV 支持） */
  export(format: 'json' | 'csv', tenantId?: string): Promise<Response> {
    const path = `/api/core/business-tools/permissions/export?format=${format}${tenantId ? `&tenant_id=${encodeURIComponent(tenantId)}` : ''}`;
    return this.http.fetchRaw(path);
  }
}
