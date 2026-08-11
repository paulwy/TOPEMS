import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  ConsolidationReport,
  ConsolidationReportDetail,
  GenerateReportRequest,
  GenerateReportResult,
  ReportLine,
  ReportQuery,
  ConsolidationPaginatedResponse,
} from './types';

export const consolidationReportApi = {
  list: (query?: ReportQuery): Promise<ConsolidationPaginatedResponse<ConsolidationReport>> => {
    return apiClient.erp.get('/consolidation/reports', { params: query });
  },

  get: (reportId: string): Promise<ApiResponse<ConsolidationReportDetail>> => {
    return apiClient.erp.get(`/consolidation/reports/${reportId}`);
  },

  generate: (data: GenerateReportRequest): Promise<ApiResponse<GenerateReportResult>> => {
    return apiClient.erp.post('/consolidation/reports/generate', data);
  },

  getLines: (reportId: string): Promise<ApiResponse<ReportLine[]>> => {
    return apiClient.erp.get(`/consolidation/reports/${reportId}/lines`);
  },

  approve: (reportId: string): Promise<ApiResponse<ConsolidationReportDetail>> => {
    return apiClient.erp.post(`/consolidation/reports/${reportId}/approve`, {});
  },

  submit: (reportId: string): Promise<ApiResponse<ConsolidationReportDetail>> => {
    return apiClient.erp.post(`/consolidation/reports/${reportId}/submit`, {});
  },

  publish: (reportId: string): Promise<ApiResponse<ConsolidationReportDetail>> => {
    return apiClient.erp.post(`/consolidation/reports/${reportId}/publish`, {});
  },

  delete: (reportId: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/consolidation/reports/${reportId}`);
  },

  export: (reportId: string, format?: string): Promise<Blob> => {
    return apiClient.erp.get(`/consolidation/reports/${reportId}/export`, {
      params: format ? { format } : undefined,
      responseType: 'blob' as const,
    }) as unknown as Promise<Blob>;
  },
};

export default consolidationReportApi;