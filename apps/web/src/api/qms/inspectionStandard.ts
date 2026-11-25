import apiClient from '../client';
import type { PaginationParams } from '../client';

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
    apiClient.qms.get<ListResponse<InspectionItem>>('/inspection-items', {
      params,
    }),
  get: (id: string) => apiClient.qms.get<InspectionItem>(`/inspection-items/${id}`),
  create: (data: CreateInspectionItemRequest) =>
    apiClient.qms.post<{ id: string }>('/inspection-items', data),
  update: (id: string, data: UpdateInspectionItemRequest) =>
    apiClient.qms.put<{ id: string }>(`/inspection-items/${id}`, data),
  remove: (id: string) => apiClient.qms.delete<string>(`/inspection-items/${id}`),
};

export const samplingPlanApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.qms.get<ListResponse<SamplingPlan>>('/sampling-plans', { params }),
  get: (id: string) => apiClient.qms.get<SamplingPlan>(`/sampling-plans/${id}`),
  create: (data: CreateSamplingPlanRequest) =>
    apiClient.qms.post<{ id: string }>('/sampling-plans', data),
  update: (id: string, data: Partial<CreateSamplingPlanRequest>) =>
    apiClient.qms.put<{ id: string }>(`/sampling-plans/${id}`, data),
  remove: (id: string) => apiClient.qms.delete<string>(`/sampling-plans/${id}`),
};

export const inspectionPlanApi = {
  list: (params: PaginationParams & { search?: string; status?: string }) =>
    apiClient.qms.get<ListResponse<InspectionPlan>>('/inspection-plans', {
      params,
    }),
  get: (id: string) => apiClient.qms.get<InspectionPlan>(`/inspection-plans/${id}`),
  create: (data: CreateInspectionPlanRequest) =>
    apiClient.qms.post<{ id: string }>('/inspection-plans', data),
  update: (id: string, data: Partial<CreateInspectionPlanRequest>) =>
    apiClient.qms.put<{ id: string }>(`/inspection-plans/${id}`, data),
  remove: (id: string) => apiClient.qms.delete<string>(`/inspection-plans/${id}`),
  listItems: (id: string) =>
    apiClient.qms.get<{ items: PlanItem[] }>(`/inspection-plans/${id}/items`),
  addItem: (id: string, data: AddPlanItemRequest) =>
    apiClient.qms.post<{ id: string }>(`/inspection-plans/${id}/items`, data),
  removeItem: (id: string, itemId: string) =>
    apiClient.qms.delete<string>(`/inspection-plans/${id}/items/${itemId}`),
};
