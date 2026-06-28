import { apiClient } from '../client';

export const syncLogsApi = {
  getSyncLogs: (params?: {
    config_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.integration.get('/api/integration/external-erp/sync-logs', {
      params,
    }),

  getSyncLog: (logId: string) =>
    apiClient.integration.get(`/api/integration/external-erp/sync-logs/${logId}`),

  getSyncStatistics: (
    configId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ) =>
    apiClient.integration.get(
      `/api/integration/external-erp/connections/${configId}/sync-statistics`,
      { params }
    ),
};

export default syncLogsApi;
