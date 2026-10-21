import apiClient from '../client';
import type { ApiResponse, PaginationParams } from '../client';

// ==================== QMS 检验项 / 检验方案 / 抽样方案（P1-7） ====================

export interface InspectionItem {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  specification?: string | null;
  method?: string | null;
  unit?: string | null;
  standard_value?: string | null;
  tolerance?: string | null;
  status: string;
  description?: string | null;
}

export interface CreateInspectionItemRequest {
  code: string;
  name: string;
  category?: string;
  specification?: string;
  method?: string;
  unit?: string;
  standard_value?: string;
  tolerance?: string;
  status?: string;
  description?: string;
}

export interface UpdateInspectionItemRequest {
  name?: string;
  category?: string;
  specification?: string;
  method?: string;
  unit?: string;
  standard_value?: string;
  tolerance?: string;
  status?: string;
  description?: string;
}

export interface SamplingPlan {
  id: string;
  code: string;
  name: string;
  level?: string | null;
  sample_size?: number | null;
  aql?: string | null;
  inspection_level?: string | null;
  status: string;
  description?: string | null;
}

export interface CreateSamplingPlanRequest {
  code: string;
  name: string;
  level?: string;
  sample_size?: number;
  aql?: string;
  inspection_level?: string;
  status?: string;
  description?: string;
}

export interface InspectionPlan {
  id: string;
  code: string;
  name: string;
  product_code?: string | null;
  product_name?: string | null;
  sampling_plan_id?: string | null;
  status: string;
  description?: string | null;
}

export interface CreateInspectionPlanRequest {
  code: string;
  name: string;
  product_code?: string;
  product_name?: string;
  sampling_plan_id?: string;
  status?: string;
  description?: string;
}

export interface PlanItem {
  id: string;
  item_id: string;
  item_code?: string | null;
  item_name?: string | null;
  sample_qty: number;
  sort_order: number;
}

export interface AddPlanItemRequest {
  item_id: string;
  sample_qty?: number;
  sort_order?: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const inspectionItemApi = {
  list: (params: PaginationParams & { search?: string; status?: string; category?: string }) =>
    apiClient.get<ApiResponse<ListResponse<InspectionItem>>>('/api/qms/inspection-items', {
      params,
    }),
  get: (id: string) =>
    apiClient.get<ApiResponse<InspectionItem>>(`/api/qms/inspection-items/${id}`),
  create: (data: CreateInspectionItemRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/qms/inspection-items', data),
  update: (id: string, data: UpdateInspectionItemRequest) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/qms/inspection-items/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/qms/inspection-items/${id}`),
};

export const samplingPlanApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<ListResponse<SamplingPlan>>>('/api/qms/sampling-plans', { params }),
  get: (id: string) => apiClient.get<ApiResponse<SamplingPlan>>(`/api/qms/sampling-plans/${id}`),
  create: (data: CreateSamplingPlanRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/qms/sampling-plans', data),
  update: (id: string, data: Partial<CreateSamplingPlanRequest>) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/qms/sampling-plans/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/qms/sampling-plans/${id}`),
};

export const inspectionPlanApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.get<ApiResponse<ListResponse<InspectionPlan>>>('/api/qms/inspection-plans', {
      params,
    }),
  get: (id: string) =>
    apiClient.get<ApiResponse<InspectionPlan>>(`/api/qms/inspection-plans/${id}`),
  create: (data: CreateInspectionPlanRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/qms/inspection-plans', data),
  update: (id: string, data: Partial<CreateInspectionPlanRequest>) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/qms/inspection-plans/${id}`, data),
  remove: (id: string) => apiClient.delete<ApiResponse<string>>(`/api/qms/inspection-plans/${id}`),
  listItems: (id: string) =>
    apiClient.get<ApiResponse<{ items: PlanItem[] }>>(`/api/qms/inspection-plans/${id}/items`),
  addItem: (id: string, data: AddPlanItemRequest) =>
    apiClient.post<ApiResponse<{ id: string }>>(`/api/qms/inspection-plans/${id}/items`, data),
  removeItem: (id: string, itemId: string) =>
    apiClient.delete<ApiResponse<string>>(`/api/qms/inspection-plans/${id}/items/${itemId}`),
};
