import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  PaginationParams,
} from './types';

export const warehouseApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Warehouse>>> => {
    return apiClient.wms.get('/warehouses', { params });
  },

  get: async (id: string): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.get(`/warehouses/${id}`);
  },

  create: async (
    data: CreateWarehouseRequest
  ): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.post('/warehouses', data);
  },

  update: async (
    id: string,
    data: UpdateWarehouseRequest
  ): Promise<ApiResponse<Warehouse>> => {
    return apiClient.wms.put(`/warehouses/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/warehouses/${id}`);
  },
};

export async function listWarehouses(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Warehouse>>> {
  return warehouseApi.list(params);
}

export async function getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
  return warehouseApi.get(id);
}

export async function createWarehouse(
  data: CreateWarehouseRequest
): Promise<ApiResponse<Warehouse>> {
  return warehouseApi.create(data);
}

export async function updateWarehouse(
  id: string,
  data: UpdateWarehouseRequest
): Promise<ApiResponse<Warehouse>> {
  return warehouseApi.update(id, data);
}

export async function deleteWarehouse(id: string): Promise<ApiResponse<string>> {
  return warehouseApi.delete(id);
}

export default warehouseApi;
