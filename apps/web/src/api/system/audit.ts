import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AuditLog, AuditLogQueryParams, PaginatedAuditLogs } from './types';

export const systemAuditApi = {
  list: async (params?: AuditLogQueryParams): Promise<ApiResponse<PaginatedAuditLogs>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.user_name) queryParams.append('user_name', params.user_name);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return apiClient.core.get<PaginatedAuditLogs>(
      `/system/audit-logs${queryString ? `?${queryString}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.core.get<AuditLog>(`/system/audit-logs/${id}`);
  },

  export: async (params?: AuditLogQueryParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.user_name) queryParams.append('user_name', params.user_name);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const response = await apiClient.core.get(
      `/system/audit-logs/export${queryString ? `?${queryString}` : ''}`,
      {
        responseType: 'blob',
      }
    );
    return response.data as unknown as Blob;
  },

  getStats: async (params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'action' | 'resource' | 'user' | 'date';
  }): Promise<ApiResponse<Record<string, number>>> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.group_by) queryParams.append('group_by', params.group_by);

    const queryString = queryParams.toString();
    return apiClient.core.get<Record<string, number>>(
      `/system/audit-logs/stats${queryString ? `?${queryString}` : ''}`
    );
  },
};

export default systemAuditApi;
