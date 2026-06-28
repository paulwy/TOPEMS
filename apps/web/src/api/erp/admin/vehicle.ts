import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { Vehicle, VehicleRequest, PaginationParams, PaginatedResult } from '../types';

export const vehicleApi = {
  async list(
    params?: PaginationParams & { vehicle_type?: string }
  ): Promise<ApiResponse<PaginatedResult<Vehicle>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.vehicle_type) searchParams.set('vehicle_type', params.vehicle_type);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/vehicles${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.get(`/api/erp/vehicles/${id}`);
  },

  async create(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.post('/api/erp/vehicles', data);
  },

  async update(id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.put(`/api/erp/vehicles/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/vehicles/${id}`);
  },

  async getRequests(id: string): Promise<ApiResponse<VehicleRequest[]>> {
    return apiClient.erp.get(`/api/erp/vehicles/${id}/requests`);
  },
};

export const vehicleRequestApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<VehicleRequest>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/vehicle-requests${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.get(`/api/erp/vehicle-requests/${id}`);
  },

  async create(data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.post('/api/erp/vehicle-requests', data);
  },

  async update(id: string, data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.put(`/api/erp/vehicle-requests/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/vehicle-requests/${id}`);
  },
};
