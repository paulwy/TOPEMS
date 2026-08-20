import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: unknown;
  user_id?: string;
  user_name?: string;
  request_details?: unknown;
  response_details?: unknown;
  status: string;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogListParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface AuditLogListResponse {
  audit_logs: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export const auditApi = {
  async list(params?: AuditLogListParams): Promise<ApiResponse<AuditLogListResponse>> {
    return apiClient.erp.get<AuditLogListResponse>('/audit-logs', { params });
  },

  async get(id: string): Promise<ApiResponse<AuditLog>> {
    return apiClient.erp.get<AuditLog>(`/audit-logs/${id}`);
  },
};
