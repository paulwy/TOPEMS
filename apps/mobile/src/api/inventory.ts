import { apiClient } from './client';
import type { ApiResponse, InventoryItem } from '@/types';

export const inventoryApi = {
  getItems: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    location?: string;
    batchNo?: string;
  }): Promise<ApiResponse<{ items: InventoryItem[]; total: number }>> => {
    return apiClient.get('/inventory', { params });
  },

  getItemById: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.get(`/inventory/${id}`);
  },

  createItem: async (data: {
    code: string;
    name: string;
    quantity: number;
    unit: string;
    location: string;
    batchNo?: string;
    expiryDate?: string;
  }): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.post('/inventory', data);
  },

  updateItem: async (
    id: string,
    data: {
      name?: string;
      quantity?: number;
      location?: string;
      batchNo?: string;
      expiryDate?: string;
    }
  ): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.put(`/inventory/${id}`, data);
  },

  deleteItem: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/inventory/${id}`);
  },

  getLowStockItems: async (): Promise<ApiResponse<InventoryItem[]>> => {
    return apiClient.get('/inventory/low-stock');
  },

  scanBarcode: async (barcode: string): Promise<ApiResponse<InventoryItem | null>> => {
    return apiClient.get('/inventory/scan', { params: { barcode } });
  },
};