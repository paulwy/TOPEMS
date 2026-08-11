import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  PaginationParams,
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
  UpdateProductionProgressRequest,
} from './types';

export interface ProductionOrderListResponse {
  orders: ProductionOrder[];
  total: number;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps = (params as { pageSize?: number } | undefined)?.pageSize
    ?? (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const productionOrderApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<ProductionOrderListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get<ProductionOrderListResponse>(
      `/production-orders${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.get<ProductionOrder>(`/production-orders/${id}`);
  },

  async create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.post<ProductionOrder>('/production-orders', data);
  },

  async update(
    id: string,
    data: UpdateProductionOrderRequest
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.put<ProductionOrder>(`/production-orders/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/production-orders/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async updateProgress(
    id: string,
    data: UpdateProductionProgressRequest
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.put<ProductionOrder>(`/production-orders/${id}/progress`, data);
  },

  async updateStatus(
    id: string,
    status: string
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.post<ProductionOrder>(`/production-orders/${id}/status`, { status });
  },

  async start(id: string): Promise<ApiResponse<ProductionOrder>> {
    return this.updateStatus(id, 'in_progress');
  },

  async complete(id: string): Promise<ApiResponse<ProductionOrder>> {
    return this.updateStatus(id, 'completed');
  },

  async cancel(id: string): Promise<ApiResponse<ProductionOrder>> {
    return this.updateStatus(id, 'cancelled');
  },

  async syncMesProgress(
    orderId: string,
    completedQuantity: number,
    status?: string
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.erp.post<ProductionOrder>('/production-orders/sync/mes-progress', {
      order_id: orderId,
      completed_quantity: completedQuantity,
      status,
    });
  },
};
