import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';
import type { AuditLog, AuditLogQueryParams } from './types';

export const auditLimsApi = {
  listAuditLogs: async (
    params?: AuditLogQueryParams
  ): Promise<ApiResponse<{ audit_logs: AuditLog[]; total: number }>> => {
    let url = '/audit-logs';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return apiClient.lims.get(url);
  },

  getAuditLog: async (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.lims.get(`/audit-logs/${id}`);
  },

  exportAuditLogs: async (
    params?: Omit<AuditLogQueryParams, 'page' | 'pagesize'>
  ): Promise<Blob> => {
    let url = '/audit-logs/export';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, url);
  },
};
