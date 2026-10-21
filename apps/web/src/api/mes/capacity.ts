import apiClient from '../client';
import type { ApiResponse, PaginationParams } from '../client';

// ==================== MES 产能日历 ====================

export interface Capacity {
  id: string;
  work_center_id?: string | null;
  work_center_name?: string | null;
  capacity_date: string;
  available_hours?: number | null;
  used_hours?: number | null;
  utilization_rate?: number | null;
  status: string;
}

export interface CreateCapacityRequest {
  work_center_id?: string;
  work_center_name?: string;
  capacity_date: string;
  available_hours?: number;
  status?: string;
}

export interface CapacityListResponse {
  items: Capacity[];
  total: number;
  page: number;
  page_size: number;
}

export const capacityApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<CapacityListResponse>>('/api/mes/capacities', { params }),
  create: (data: CreateCapacityRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/mes/capacities', data),
  update: (id: string, data: Partial<CreateCapacityRequest>) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/mes/capacities/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/mes/capacities/${id}`),
};
