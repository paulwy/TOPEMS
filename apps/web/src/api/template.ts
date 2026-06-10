import apiClient from './client';
import type { ApiResponse } from './client';

export interface Template {
  id: string;
  name: string;
  code: string;
  category: string;
  module: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
  default_value?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  code: string;
  icon?: string;
  description?: string;
  template_count: number;
}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  category: string;
  module: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  is_active?: boolean;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  module?: string;
  is_active?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const templateApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Template>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.module) searchParams.set('module', params.module);
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));

    const queryString = searchParams.toString();
    return await apiClient.doc.get(`/api/v1/templates${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.get(`/api/v1/templates/${id}`);
  },

  async create(data: CreateTemplateRequest): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post('/api/v1/templates', data);
  },

  async update(id: string, data: Partial<CreateTemplateRequest>): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/api/v1/templates/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return await apiClient.doc.delete(`/api/v1/templates/${id}`);
  },

  async listCategories(): Promise<ApiResponse<TemplateCategory[]>> {
    return await apiClient.doc.get('/api/v1/templates/categories');
  },

  async render(id: string, variables: Record<string, any>): Promise<ApiResponse<string>> {
    return await apiClient.doc.post(`/api/v1/templates/${id}/render`, { variables });
  },

  async duplicate(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post(`/api/v1/templates/${id}/duplicate`);
  },

  async toggleStatus(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/api/v1/templates/${id}/toggle-status`);
  },
};
