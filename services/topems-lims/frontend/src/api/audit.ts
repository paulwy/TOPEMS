import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface AuditLog {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name: string;
  user_id: string;
  user_name: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface AuditLogListParams {
  page?: number;
  page_size?: number;
  search?: string;
  action_type?: string;
  target_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export const auditApi = {
  list: async (params: AuditLogListParams = {}): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
    const response = await apiClient.get('/api/audit-logs', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<AuditLog>> => {
    const response = await apiClient.get(`/api/audit-logs/${id}`);
    return response.data;
  },

  export: async (params: AuditLogListParams): Promise<ApiResponse<{ file_url: string }>> => {
    const response = await apiClient.post('/api/audit-logs/export', params);
    return response.data;
  },
};