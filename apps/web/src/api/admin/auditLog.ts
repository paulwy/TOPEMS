import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AuditLog, AuditLogQueryParams } from './types';

interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  pagesize: number;
}

export const auditLogApi = {
  listAuditLogs: async (params?: AuditLogQueryParams): Promise<ApiResponse<PaginatedAuditLogs>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.resource) queryParams.append('resource', params.resource);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.erp.get<PaginatedAuditLogs>(`/system/audit-logs?${queryParams.toString()}`);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.erp.get<AuditLog>(`/system/audit-logs/${id}`);
  },

  exportAuditLogs: async (params?: AuditLogQueryParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.resource) queryParams.append('resource', params.resource);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.erp.get(
      `/system/audit-logs/export?${queryParams.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data as unknown as Blob;
  },

  getAuditLogStats: async (params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'action' | 'resource' | 'user' | 'date';
  }): Promise<ApiResponse<Record<string, number>>> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.group_by) queryParams.append('group_by', params.group_by);

    return apiClient.erp.get<Record<string, number>>(
      `/system/audit-logs/stats?${queryParams.toString()}`
    );
  },
};

export default auditLogApi;
