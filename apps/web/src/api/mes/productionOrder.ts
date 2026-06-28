import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
  CreateFromErpRequest,
} from './types';

export const productionOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: ProductionOrder[];
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
    return apiClient.mes.get(`/api/mes/orders${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.get(`/api/mes/orders/${id}`);
  },

  async create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.post('/api/mes/orders', data);
  },

  async update(
    id: string,
    data: UpdateProductionOrderRequest
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/orders/${id}`);
  },

  async release(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/release`);
  },

  async start(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/start`);
  },

  async complete(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/complete`);
  },

  async cancel(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/cancel`);
  },

  async createFromErp(data: CreateFromErpRequest): Promise<ApiResponse<ProductionOrder[]>> {
    return apiClient.mes.post('/api/mes/orders/from-erp', data);
  },
};
