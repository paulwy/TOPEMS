import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  user_name?: string;
  status: string;
  error_message?: string;
  request_details?: Record<string, unknown>;
  response_details?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
}

export interface AuditLogQueryParams extends PaginationParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { page_size?: number } | undefined)?.page_size;
  return ps ? ps.toString() : undefined;
};

export const auditApi = {
  async list(params?: AuditLogQueryParams): Promise<ApiResponse<AuditLogListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('page_size', ps);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entity_type) searchParams.set('entity_type', params.entity_type);
    if (params?.user_id) searchParams.set('user_id', params.user_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const queryString = searchParams.toString();
    return apiClient.erp.get<AuditLogListResponse>(
      `/audit-logs${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<AuditLog>> {
    return apiClient.erp.get<AuditLog>(`/audit-logs/${id}`);
  },
};
