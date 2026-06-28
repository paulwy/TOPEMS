import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SerialNumber,
  CreateSerialNumberRequest,
  UpdateSerialNumberRequest,
  SerialNumberQueryParams,
  SerialNumberStatistics,
} from './types';

export const serialNumberApi = {
  list: async (
    params?: SerialNumberQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SerialNumber>>> => {
    return apiClient.wms.get('/api/wms/serial-numbers', { params });
  },

  create: async (data: CreateSerialNumberRequest): Promise<ApiResponse<SerialNumber>> => {
    return apiClient.wms.post('/api/wms/serial-numbers', data);
  },

  bulkCreate: async (data: CreateSerialNumberRequest[]): Promise<ApiResponse<SerialNumber[]>> => {
    return apiClient.wms.post('/api/wms/serial-numbers/bulk', data);
  },

  get: async (id: string): Promise<ApiResponse<SerialNumber>> => {
    return apiClient.wms.get(`/api/wms/serial-numbers/${id}`);
  },

  getBySerialNo: async (serialNo: string): Promise<ApiResponse<SerialNumber>> => {
    return apiClient.wms.get(`/api/wms/serial-numbers/by-serial/${serialNo}`);
  },

  update: async (
    id: string,
    data: UpdateSerialNumberRequest
  ): Promise<ApiResponse<SerialNumber>> => {
    return apiClient.wms.put(`/api/wms/serial-numbers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/api/wms/serial-numbers/${id}`);
  },

  getStatistics: async (warehouseId?: string): Promise<ApiResponse<SerialNumberStatistics>> => {
    const params: Record<string, string> = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    return apiClient.wms.get('/api/wms/serial-numbers/statistics', { params });
  },

  getByBatch: async (batchNo: string): Promise<ApiResponse<SerialNumber[]>> => {
    return apiClient.wms.get(`/api/wms/serial-numbers/by-batch/${batchNo}`);
  },

  transferLocation: async (
    id: string,
    data: { to_location_id: string; remark?: string }
  ): Promise<ApiResponse<SerialNumber>> => {
    return apiClient.wms.post(`/api/wms/serial-numbers/${id}/transfer-location`, data);
  },

  getTrace: async (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.wms.get(`/api/wms/serial-numbers/${id}/trace`);
  },
};
