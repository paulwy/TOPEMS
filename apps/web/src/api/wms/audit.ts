import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { AuditLog, AuditLogPaginationParams } from './types';

export const auditLogApi = {
  list: async (
    params?: AuditLogPaginationParams
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
    return apiClient.wms.get('/audit-logs', { params });
  },

  get: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.wms.get(`/audit-logs/${id}`);
  },

  getModules: async (): Promise<ApiResponse<{ modules: string[] }>> => {
    return apiClient.wms.get('/audit-logs/modules');
  },
};

export async function listAuditLogs(
  params?: AuditLogPaginationParams
): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
  return auditLogApi.list(params);
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  return auditLogApi.get(id);
}

export async function getAuditLogModules(): Promise<ApiResponse<{ modules: string[] }>> {
  return auditLogApi.getModules();
}

export default auditLogApi;
