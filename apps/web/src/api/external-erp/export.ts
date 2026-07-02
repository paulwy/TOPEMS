import { apiClient, downloadBlob } from '../client';
import config from '../../config/runtime';

export const exportApi = {
  exportSyncLogs: async (params: {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.integration as any).defaults?.baseURL || config.services.integration;
    return downloadBlob(baseURL, '/external-erp/export/sync-logs', { params });
  },

  exportMappingRules: async (params: {
    config_id: string;
    mapping_type: 'account' | 'customer' | 'supplier' | 'project' | 'department' | 'employee';
    format: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.integration as any).defaults?.baseURL || config.services.integration;
    return downloadBlob(baseURL, '/external-erp/export/mappings', { params });
  },
};

export default exportApi;
