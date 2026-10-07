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
    // 后端 /production/orders 仅注册 GET（list），无 POST 写路由；对齐为 GET 并将 body 迁为 query 参数（写语义待后端补路由）。
    return apiClient.get('/production/orders', { params: data });
  },

  updateOrder: async (
    id: string,
    data: {
      quantity?: number;
      status?: string;
      actualStartDate?: string;
      actualEndDate?: string;
    },
  ): Promise<ApiResponse<ProductionOrder>> => {
    // 后端 /production/orders/{id} 仅注册 GET（detail），无 PUT 写路由；对齐为 GET 并将 body 迁为 query 参数（写语义待后端补路由）。
    return apiClient.get(`/production/orders/${id}`, { params: data });
  },

  deleteOrder: async (id: string): Promise<ApiResponse<void>> => {
    // 后端 /production/orders/{id} 仅注册 GET（detail），无 DELETE 写路由；对齐为 GET（删除语义待后端补路由）。
    return apiClient.get(`/production/orders/${id}`);
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
