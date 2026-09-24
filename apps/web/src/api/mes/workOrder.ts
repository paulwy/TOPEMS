import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
} from './types';

export const workOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      work_orders: WorkOrder[];
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
    return apiClient.mes.get(`/work-orders${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.get(`/work-orders/${id}`);
  },

  async create(data: CreateWorkOrderRequest): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.post('/work-orders', data);
  },

  async update(id: string, data: UpdateWorkOrderRequest): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/work-orders/${id}`);
  },

  async start(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}/start`);
  },

  async complete(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}/complete`);
  },

  async cancel(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}/cancel`);
  },

  async pause(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}/pause`);
  },

  async resume(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/work-orders/${id}/resume`);
  },
};
