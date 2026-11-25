import apiClient from '../client';
import type { PaginationParams } from '../client';

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
    apiClient.mes.get<CapacityListResponse>('/capacities', { params }),
  create: (data: CreateCapacityRequest) => apiClient.mes.post<{ id: string }>('/capacities', data),
  update: (id: string, data: Partial<CreateCapacityRequest>) =>
    apiClient.mes.put<{ id: string }>(`/capacities/${id}`, data),
  remove: (id: string) => apiClient.mes.delete<string>(`/capacities/${id}`),

  // ── v74 to_bind 补绑（2026-10-29）──
  maintenance: (id: string, data?: Record<string, unknown>) =>
    apiClient.mes.post<Record<string, unknown>>(`/capacities/${id}/maintenance`, data),
};
