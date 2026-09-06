/** 业务工具 SDK 共享类型（V0.1） */

/** 统一分页响应 */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/** 分页请求参数 */
export interface PageParams {
  page?: number;
  page_size?: number;
  keyword?: string;
}

/** 权限 */
export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  resource?: string | null;
  action?: string | null;
}

/** 角色 */
export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permission_count: number;
}

/** 审计日志条目 */
export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  created_at: string;
  detail?: Record<string, unknown> | null;
}

/** 保留策略 */
export interface RetentionPolicy {
  id: string;
  name: string;
  days: number;
  enabled: boolean;
  created_at: string;
}

/** 保留任务状态 */
export interface RetentionTaskStatus {
  running: boolean;
  last_run_at?: string | null;
  last_processed: number;
  next_run_at?: string | null;
}

/** 导出任务状态 */
export interface ExportTaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  download_url?: string | null;
}

/** 批量操作结果 */
export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
}

/** 批量操作结果（V530f） */
export interface BulkPermissionResult {
  total: number;
  succeeded: number;
  skipped: number;
  events?: PermissionChangeEvent[];
}

/** 权限变更事件（V530f） */
export interface PermissionChangeEvent {
  action: 'create' | 'update' | 'delete' | 'bulk_create' | 'bulk_update' | 'bulk_delete';
  tenant_id: string;
  user_id: string;
  at: string;
}

/** 权限批量请求体（V530f） */
export interface BulkPermissionRequest {
  permissions: Array<{
    tenant_id: string;
    user_id: string;
    role: string;
    active?: boolean;
    tool_permissions?: Array<{
      tool: string;
      max_permission: string;
      allowed_operations?: string[];
      denied_operations?: string[];
    }>;
  }>;
}

/** 权限导出格式（V530f CSV 支持） */
export type PermissionExportFormat = 'json' | 'csv';
