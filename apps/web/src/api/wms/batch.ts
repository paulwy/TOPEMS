import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Batch,
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchQueryParams,
  BatchStatistics,
} from './types';

export const batchApi = {
  list: async (params?: BatchQueryParams): Promise<ApiResponse<PaginatedResponse<Batch>>> => {
    return apiClient.wms.get('/api/wms/batches', { params });
  },

  create: async (data: CreateBatchRequest): Promise<ApiResponse<Batch>> => {
    return apiClient.wms.post('/api/wms/batches', data);
  },

  get: async (id: string): Promise<ApiResponse<Batch>> => {
    return apiClient.wms.get(`/api/wms/batches/${id}`);
  },

  update: async (id: string, data: UpdateBatchRequest): Promise<ApiResponse<Batch>> => {
    return apiClient.wms.put(`/api/wms/batches/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/wms/batches/${id}`);
  },

  getStatistics: async (warehouseId?: string): Promise<ApiResponse<BatchStatistics>> => {
    const params: Record<string, string> = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    return apiClient.wms.get('/api/wms/batches/statistics', { params });
  },

  getExpiringSoon: async (days?: number, warehouseId?: string): Promise<ApiResponse<Batch[]>> => {
    const params: Record<string, string | number> = {};
    if (days) params.days = days;
    if (warehouseId) params.warehouse_id = warehouseId;
    return apiClient.wms.get('/api/wms/batches/expiring-soon', { params });
  },

  getExpired: async (warehouseId?: string): Promise<ApiResponse<Batch[]>> => {
    const params: Record<string, string> = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    return apiClient.wms.get('/api/wms/batches/expired', { params });
  },

  adjustQuantity: async (
    id: string,
    data: { quantity: number; reason: string; remark?: string }
  ): Promise<ApiResponse<Batch>> => {
    return apiClient.wms.post(`/api/wms/batches/${id}/adjust-quantity`, data);
  },

  transferLocation: async (
    id: string,
    data: { to_location_id: string; quantity: number; remark?: string }
  ): Promise<ApiResponse<Batch>> => {
    return apiClient.wms.post(`/api/wms/batches/${id}/transfer-location`, data);
  },
};
