import apiClient from '../client';
import type { ApiResponse, PaginationParams } from '../client';

// ==================== 公共主数据域（P2-11）：物料 / UOM / 样品 ====================

export interface MasterMaterial {
  id: string;
  material_code: string;
  material_name: string;
  material_type?: string | null;
  specification?: string | null;
  unit?: string | null;
  uom_id?: string | null;
  status?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterUom {
  id: string;
  uom_code: string;
  uom_name: string;
  uom_type?: string | null;
  category?: string | null;
  status?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterSample {
  id: string;
  sample_code: string;
  sample_name: string;
  sample_type?: string | null;
  source?: string | null;
  status?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterListResponse {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
}

const BASE = '/api/master-data/master-data';

export const materialApi = {
  list: (params: PaginationParams & { material_type?: string; status?: string; search?: string }) =>
    apiClient.get<ApiResponse<MasterListResponse>>(`${BASE}/materials`, { params }),
  get: (id: string) => apiClient.get<ApiResponse<MasterMaterial>>(`${BASE}/materials/${id}`),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<MasterMaterial>>(`${BASE}/materials`, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<MasterMaterial>>(`${BASE}/materials/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`${BASE}/materials/${id}`),
};

export const uomApi = {
  list: (params: PaginationParams & { uom_type?: string; status?: string; search?: string }) =>
    apiClient.get<ApiResponse<MasterListResponse>>(`${BASE}/uoms`, { params }),
  get: (id: string) => apiClient.get<ApiResponse<MasterUom>>(`${BASE}/uoms/${id}`),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<MasterUom>>(`${BASE}/uoms`, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<MasterUom>>(`${BASE}/uoms/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`${BASE}/uoms/${id}`),
};

export const sampleApi = {
  list: (params: PaginationParams & { sample_type?: string; status?: string; search?: string }) =>
    apiClient.get<ApiResponse<MasterListResponse>>(`${BASE}/samples`, { params }),
  get: (id: string) => apiClient.get<ApiResponse<MasterSample>>(`${BASE}/samples/${id}`),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<MasterSample>>(`${BASE}/samples`, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<MasterSample>>(`${BASE}/samples/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`${BASE}/samples/${id}`),
};
