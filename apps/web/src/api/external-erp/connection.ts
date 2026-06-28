import { apiClient } from '../client';
import type {
  KingdeeConnectionConfig,
  YonyouConnectionConfig,
  SapConnectionConfig,
  CompanyMapping,
  ConnectionTestRequest,
} from './types';

export const connectionApi = {
  getConnections: (params?: {
    type?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }) =>
    apiClient.integration.get('/api/integration/external-erp/connections', {
      params,
    }),

  getConnection: (id: string) =>
    apiClient.integration.get(`/api/integration/external-erp/connections/${id}`),

  createConnection: (data: {
    type: 'kingdee' | 'yonyou' | 'sap';
    name: string;
    api_url: string;
    app_key?: string;
    app_secret?: string;
    sync_direction?: 'import' | 'export' | 'bidirectional';
    sync_mode?: 'realtime' | 'scheduled' | 'manual';
    company_mappings?: CompanyMapping[];
  }) => apiClient.integration.post('/api/integration/external-erp/connections', data),

  updateConnection: (
    id: string,
    data: Partial<KingdeeConnectionConfig | YonyouConnectionConfig | SapConnectionConfig>
  ) => apiClient.integration.put(`/api/integration/external-erp/connections/${id}`, data),

  deleteConnection: (id: string) =>
    apiClient.integration.delete(`/api/integration/external-erp/connections/${id}`),

  toggleConnection: (id: string, enabled: boolean) =>
    apiClient.integration.put(`/api/integration/external-erp/connections/${id}/toggle`, {
      enabled,
    }),

  testConnection: (data: ConnectionTestRequest) =>
    apiClient.integration.post('/api/integration/external-erp/connections/test', data),

  syncConnectionStatus: (id: string) =>
    apiClient.integration.post(`/api/integration/external-erp/connections/${id}/sync-status`, {}),

  getCompanyMappings: (configId: string) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/company-mappings`
    ),

  addCompanyMapping: (configId: string, mapping: CompanyMapping) =>
    apiClient.integration.post(
      `/api/integration/external-erp/connections/${configId}/company-mappings`,
      mapping
    ),

  updateCompanyMapping: (configId: string, mappingId: string, mapping: Partial<CompanyMapping>) =>
    apiClient.integration.put(
      `/api/integration/external-erp/connections/${configId}/company-mappings/${mappingId}`,
      mapping
    ),

  deleteCompanyMapping: (configId: string, mappingId: string) =>
    apiClient.integration.delete(
      `/api/integration/external-erp/connections/${configId}/company-mappings/${mappingId}`
    ),
};

export default connectionApi;
