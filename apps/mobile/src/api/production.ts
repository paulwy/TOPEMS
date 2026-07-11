import { apiClient } from './client';
import type { ApiResponse, ProductionOrder } from '@/types';

export const productionApi = {
  getOrders: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    productName?: string;
  }): Promise<ApiResponse<{ items: ProductionOrder[]; total: number }>> => {
    return apiClient.get('/production/orders', { params });
  },

  getOrderById: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.get(`/production/orders/${id}`);
  },

  createOrder: async (data: {
    orderNo: string;
    productName: string;
    quantity: number;
    scheduledDate: string;
  }): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.post('/production/orders', data);
  },

  updateOrder: async (
    id: string,
    data: {
      quantity?: number;
      status?: string;
      actualStartDate?: string;
      actualEndDate?: string;
    }
  ): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.put(`/production/orders/${id}`, data);
  },

  deleteOrder: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/production/orders/${id}`);
  },

  startOrder: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.post(`/production/orders/${id}/start`);
  },

  completeOrder: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.post(`/production/orders/${id}/complete`);
  },

  getTodayOrders: async (): Promise<ApiResponse<ProductionOrder[]>> => {
    return apiClient.get('/production/orders/today');
  },

  getWorkstationOrders: async (workstationId: string): Promise<ApiResponse<ProductionOrder[]>> => {
    return apiClient.get(`/production/workstations/${workstationId}/orders`);
  },
};