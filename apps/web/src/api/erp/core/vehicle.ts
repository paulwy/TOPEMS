import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  brand?: string;
  model?: string;
  year?: number;
  status: 'available' | 'in_use' | 'maintenance' | 'scrapped';
  driver?: string;
  department_id?: string;
  department_name?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleListResponse {
  items: Vehicle[];
  total: number;
}

export interface CreateVehicleRequest {
  plate_number: string;
  vehicle_type: string;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  driver?: string;
  department_id?: string;
  remark?: string;
}

export interface UpdateVehicleRequest {
  vehicle_type?: string;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  driver?: string;
  department_id?: string;
  remark?: string;
}

export interface VehicleRequest {
  id: string;
  vehicle_id: string;
  vehicle_plate?: string;
  requester_id?: string;
  requester_name?: string;
  purpose?: string;
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface VehicleRequestListResponse {
  items: VehicleRequest[];
  total: number;
}

export interface CreateVehicleRequestPayload {
  vehicle_id: string;
  purpose?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateVehicleRequestPayload {
  purpose?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const vehicleApi = {
  async list(
    params?: PaginationParams & { vehicle_type?: string }
  ): Promise<ApiResponse<VehicleListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if ((params as { vehicle_type?: string })?.vehicle_type)
      searchParams.set(
        'vehicle_type',
        (params as { vehicle_type?: string }).vehicle_type as string
      );

    const queryString = searchParams.toString();
    return apiClient.erp.get<VehicleListResponse>(
      `/vehicles${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.get<Vehicle>(`/vehicles/${id}`);
  },

  async create(data: CreateVehicleRequest): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.post<Vehicle>('/vehicles', data);
  },

  async update(id: string, data: UpdateVehicleRequest): Promise<ApiResponse<Vehicle>> {
    return apiClient.erp.put<Vehicle>(`/vehicles/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/vehicles/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async listRequests(
    params?: PaginationParams & { status?: string }
  ): Promise<ApiResponse<VehicleRequestListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get<VehicleRequestListResponse>(
      `/vehicle-requests${queryString ? `?${queryString}` : ''}`
    );
  },

  async getRequest(id: string): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.get<VehicleRequest>(`/vehicle-requests/${id}`);
  },

  async createRequest(data: CreateVehicleRequestPayload): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.post<VehicleRequest>('/vehicle-requests', data);
  },

  async updateRequest(
    id: string,
    data: UpdateVehicleRequestPayload
  ): Promise<ApiResponse<VehicleRequest>> {
    return apiClient.erp.put<VehicleRequest>(`/vehicle-requests/${id}`, data);
  },

  async removeRequest(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/vehicle-requests/${id}`);
  },
  async deleteRequest(id: string): Promise<ApiResponse<string>> {
    return this.removeRequest(id);
  },

  async listVehicleRequests(
    vehicleId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<VehicleRequestListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);

    const queryString = searchParams.toString();
    return apiClient.erp.get<VehicleRequestListResponse>(
      `/vehicles/${vehicleId}/requests${queryString ? `?${queryString}` : ''}`
    );
  },
};
