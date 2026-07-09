import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from './types';

export const purchaseOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: PurchaseOrder[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pagesize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/purchase-orders${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.erp.get(`/purchase-orders/${id}`);
  },

  async create(data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.erp.post('/purchase-orders', data);
  },

  async update(id: string, data: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.erp.put(`/purchase-orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/purchase-orders/${id}`);
  },

  async approve(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.erp.put(`/purchase-orders/${id}/approve`);
  },

  async cancel(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.erp.put(`/purchase-orders/${id}/cancel`);
  },
};
