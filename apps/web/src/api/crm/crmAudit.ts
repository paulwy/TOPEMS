import { apiClient } from '../client';
import type { ApiResponse } from '../client';

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_ids?: Record<string, unknown> | null;
  user_id?: string;
  user_name?: string;
  request_details?: Record<string, unknown> | null;
  response_details?: Record<string, unknown> | null;
  status: string;
  error_message?: string;
  created_at?: string;
}

interface AuditLogListQuery {
  page?: number;
  page_size?: number;
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
}

export const crmAuditApi = {
  async listAuditLogs(params?: AuditLogListQuery): Promise<ApiResponse<AuditLogListResponse>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.action) qs.set('action', params.action);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.crm.get<AuditLogListResponse>(`/audit-logs${s ? `?${s}` : ''}`);
  },

  async getAuditLog(id: string): Promise<ApiResponse<AuditLogItem>> {
    return apiClient.crm.get<AuditLogItem>(`/audit-logs/${id}`);
  },
};
