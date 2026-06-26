import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  AuditLog,
  AuditLogQueryParams,
  AuditLogDetail,
} from './types';

export const auditLogApi = {
  list: async (
    params?: AuditLogQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
    return apiClient.scm.get('/api/scm/audit-logs', { params });
  },

  get: async (id: string): Promise<ApiResponse<AuditLogDetail>> => {
    return apiClient.scm.get(`/api/scm/audit-logs/${id}`);
  },
};
