import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * 操作审计日志
 *
 * 区别于 `systemAuditApi`（基于 audit_logs 表的 HTTP 请求审计）和
 * `LoginLogPage`（基于 core_login_logs 的登录日志），本 API 用于查询
 * 由 `operation_audit_middleware` 自动记录的业务 CRUD 写操作日志。
 */

export interface OperationLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  user_name: string;
  module: string;
  operation: string;
  resource_type: string;
  resource_id?: string;
  description?: string;
  request_data?: Record<string, unknown> | null;
  response_status?: number;
  ip_address?: string;
  user_agent?: string;
  trace_id?: string;
  created_at: string;
}

interface OperationLogQueryParams {
  page?: number;
  page_size?: number;
  user_id?: string;
  user_name?: string;
  module?: string;
  operation?: string;
  resource_type?: string;
  resource_id?: string;
  trace_id?: string;
  start_time?: string;
  end_time?: string;
  success?: boolean;
}

interface PaginatedOperationLogs {
  items: OperationLog[];
  total: number;
  page: number;
  page_size: number;
}

interface OperationLogStats {
  total: number;
  by_module: Record<string, number>;
  by_operation: Record<string, number>;
}

export const operationAuditApi = {
  list: async (params?: OperationLogQueryParams): Promise<ApiResponse<PaginatedOperationLogs>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.user_name) queryParams.append('user_name', params.user_name);
    if (params?.module) queryParams.append('module', params.module);
    if (params?.operation) queryParams.append('operation', params.operation);
    if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
    if (params?.resource_id) queryParams.append('resource_id', params.resource_id);
    if (params?.trace_id) queryParams.append('trace_id', params.trace_id);
    if (params?.start_time) queryParams.append('start_time', params.start_time);
    if (params?.end_time) queryParams.append('end_time', params.end_time);
    if (params?.success !== undefined) {
      queryParams.append('success', params.success.toString());
    }

    const queryString = queryParams.toString();
    return apiClient.core.get<PaginatedOperationLogs>(
      `/audit/operations${queryString ? `?${queryString}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<OperationLog>> => {
    return apiClient.core.get<OperationLog>(`/audit/operations/${id}`);
  },

  getStats: async (): Promise<ApiResponse<OperationLogStats>> => {
    return apiClient.core.get<OperationLogStats>('/audit/operations/stats');
  },
};

export default operationAuditApi;
