import { invoke } from '@tauri-apps/api/core';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AuditLogParams {
  action?: string;
  target_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
  request_id?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id?: string;
  user_id: string;
  user_name?: string;
  ip_address?: string;
  details?: Record<string, unknown>;
  created_at: string;
  [key: string]: unknown;
}

export interface ExportFormat {
  value: 'csv' | 'json' | 'excel';
  label: string;
}

export interface ExportParams {
  resourceType: string;
  format: 'csv' | 'json' | 'excel';
  filters?: Record<string, unknown>;
  requestId?: string;
}

export interface ExportResult {
  url?: string;
  file_path?: string;
  download_url?: string;
  [key: string]: unknown;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'excel', label: 'Excel' },
];

export const RESOURCE_TYPES = [
  { value: 'users', label: '用户' },
  { value: 'projects', label: '项目' },
  { value: 'issues', label: '工单' },
  { value: 'audit_logs', label: '审计日志' },
  { value: 'roles', label: '角色' },
  { value: 'plugins', label: '插件' },
];

export const AUDIT_ACTIONS = [
  { value: '', label: '全部操作' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
];

function normalizeAuditLogs(data: unknown): AuditLogEntry[] {
  if (Array.isArray(data)) {
    return data as AuditLogEntry[];
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items as AuditLogEntry[];
    }
    if (Array.isArray(obj.data)) {
      return obj.data as AuditLogEntry[];
    }
    if (Array.isArray(obj.logs)) {
      return obj.logs as AuditLogEntry[];
    }
  }
  return [];
}

export const auditApi = {
  getAuditLogs: async (params: AuditLogParams = {}): Promise<AuditLogEntry[]> => {
    const response = await invoke<ApiResponse<unknown>>('get_audit_logs', {
      action: params.action || null,
      target_type: params.target_type || null,
      user_id: params.user_id || null,
      from: params.from || null,
      to: params.to || null,
      request_id: params.request_id || null,
    });

    if (!response.success) {
      throw new Error(response.error || '获取审计日志失败');
    }

    return normalizeAuditLogs(response.data);
  },

  exportData: async (params: ExportParams): Promise<ExportResult> => {
    const response = await invoke<ApiResponse<ExportResult>>('export_data', {
      resource_type: params.resourceType,
      format: params.format,
      filters: params.filters ?? null,
      request_id: params.requestId || null,
    });

    if (!response.success) {
      throw new Error(response.error || '数据导出失败');
    }

    return response.data ?? {};
  },
};
