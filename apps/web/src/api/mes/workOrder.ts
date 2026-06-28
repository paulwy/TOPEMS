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
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/work-orders${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.get(`/api/mes/work-orders/${id}`);
  },

  async create(data: CreateWorkOrderRequest): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.post('/api/mes/work-orders', data);
  },

  async update(id: string, data: UpdateWorkOrderRequest): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/work-orders/${id}`);
  },

  async start(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}/start`);
  },

  async complete(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}/complete`);
  },

  async cancel(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}/cancel`);
  },

  async pause(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}/pause`);
  },

  async resume(id: string): Promise<ApiResponse<WorkOrder>> {
    return apiClient.mes.put(`/api/mes/work-orders/${id}/resume`);
  },
};
