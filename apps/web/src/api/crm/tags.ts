import apiClient from '../client';
import type { PaginationParams } from '../client';

// ==================== CRM 客户标签（复用既有 crm.tags 路由） ====================

export interface CrmTag {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface TagListResponse {
  items: CrmTag[];
  total: number;
  page: number;
  page_size: number;
}

export const tagApi = {
  list: (params: PaginationParams & { search?: string }) =>
    apiClient.crm.get<TagListResponse>('/tags', { params }),
  get: (id: string) => apiClient.crm.get<CrmTag>(`/tags/${id}`),
  create: (data: CreateTagRequest) => apiClient.crm.post<{ id: string }>('/tags', data),
  update: (id: string, data: UpdateTagRequest) =>
    apiClient.crm.put<{ id: string }>(`/tags/${id}`, data),
  remove: (id: string) => apiClient.crm.delete<string>(`/tags/${id}`),
};
