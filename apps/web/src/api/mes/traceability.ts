import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PaginationParams, TraceChain, QualityRecord } from './types';

export const traceabilityApi = {
  async forwardTraceability(orderId: string): Promise<ApiResponse<TraceChain>> {
    return apiClient.mes.get(`/api/mes/traceability/forward/${orderId}`);
  },

  async backwardTraceability(batchNo: string): Promise<ApiResponse<TraceChain>> {
    return apiClient.mes.get(`/api/mes/traceability/backward/${batchNo}`);
  },

  async getTraceChain(params: {
    type: 'forward' | 'backward';
    identifier: string;
  }): Promise<ApiResponse<TraceChain>> {
    const searchParams = new URLSearchParams();
    searchParams.set('type', params.type);
    searchParams.set('identifier', params.identifier);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/traceability/chain${queryString ? `?${queryString}` : ''}`);
  },

  async listQualityRecords(params?: PaginationParams): Promise<
    ApiResponse<{
      records: QualityRecord[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/mes/traceability/quality-records${queryString ? `?${queryString}` : ''}`
    );
  },
};
