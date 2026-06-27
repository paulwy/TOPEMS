import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  Wip,
  CreateWipRequest,
  UpdateWipRequest,
  WipTransfer,
  TransferWipRequest,
  WipStatistics,
} from './types';

export const wipApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      wips: Wip[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/wips${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Wip>> {
    return apiClient.mes.get(`/api/mes/wips/${id}`);
  },

  async create(data: CreateWipRequest): Promise<ApiResponse<Wip>> {
    return apiClient.mes.post('/api/mes/wips', data);
  },

  async update(id: string, data: UpdateWipRequest): Promise<ApiResponse<Wip>> {
    return apiClient.mes.put(`/api/mes/wips/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/wips/${id}`);
  },

  async transfer(data: TransferWipRequest): Promise<ApiResponse<WipTransfer>> {
    return apiClient.mes.post('/api/mes/wips/transfer', data);
  },

  async listTransfers(params?: PaginationParams & { wip_id?: string }): Promise<
    ApiResponse<{
      transfers: WipTransfer[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.wip_id) searchParams.set('wip_id', params.wip_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/wips/transfers${queryString ? `?${queryString}` : ''}`);
  },

  async getStatistics(): Promise<ApiResponse<WipStatistics>> {
    return apiClient.mes.get('/api/mes/wips/statistics');
  },
};
