import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  SalesOrder,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
} from './types';

export const salesOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: SalesOrder[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/sales-orders${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.get(`/sales-orders/${id}`);
  },

  async create(data: CreateSalesOrderRequest): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.post('/sales-orders', data);
  },

  async update(id: string, data: UpdateSalesOrderRequest): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.put(`/sales-orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/sales-orders/${id}`);
  },

  async approve(id: string): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.put(`/sales-orders/${id}/approve`);
  },

  async ship(id: string): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.put(`/sales-orders/${id}/ship`);
  },

  async complete(id: string): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.put(`/sales-orders/${id}/complete`);
  },

  async cancel(id: string): Promise<ApiResponse<SalesOrder>> {
    return apiClient.erp.put(`/sales-orders/${id}/cancel`);
  },
};
