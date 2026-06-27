import apiClient from './client';
import type { ApiResponse } from './client';

export type TemplateType = 'workflow' | 'document' | 'form' | 'report' | 'notification';

export type VariableType =
  | 'string'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'lookup'
  | 'user'
  | 'now'
  | 'context';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: VariableType;
  required?: boolean;
  default_value?: unknown;
  options?: SelectOption[];
  data_source?: string;
  validation_rules?: Record<string, any>;
  placeholder?: string;
  description?: string;
}

export interface Template {
  id: string;
  name: string;
  code: string;
  template_type: TemplateType;
  category_id?: string;
  category_name?: string;
  module?: string;
  description?: string;
  content: string;
  variables: TemplateVariable[];
  is_active: boolean;
  is_system: boolean;
  is_public: boolean;
  ai_enabled: boolean;
  version: number;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  code: string;
  category_type?: TemplateType;
  icon?: string;
  description?: string;
  template_count: number;
  is_active: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  template_type?: TemplateType;
  category_id?: string;
  module: string;
  description?: string;
  content: string;
  variables?: TemplateVariable[];
  is_active?: boolean;
  is_public?: boolean;
  ai_enabled?: boolean;
  sort_order?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: TemplateType;
  category?: string;
  module?: string;
  is_active?: boolean;
  is_public?: boolean;
}

export interface RenderTemplateRequest {
  variables: Record<string, any>;
}

export interface RenderTemplateResponse {
  content: string;
  missing_variables: string[];
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
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.module) searchParams.set('module', params.module);
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params?.is_public !== undefined) searchParams.set('is_public', String(params.is_public));

    const queryString = searchParams.toString();
    return await apiClient.doc.get(`/api/templates${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.get(`/api/templates/${id}`);
  },

  async create(data: CreateTemplateRequest): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post('/api/templates', data);
  },

  async update(id: string, data: Partial<CreateTemplateRequest>): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/api/templates/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return await apiClient.doc.delete(`/api/templates/${id}`);
  },

  async listCategories(
    params?: Pick<PaginationParams, 'is_active' | 'type'>
  ): Promise<ApiResponse<TemplateCategory[]>> {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params?.type) searchParams.set('type', params.type);

    const queryString = searchParams.toString();
    return await apiClient.doc.get(
      `/api/templates/categories${queryString ? `?${queryString}` : ''}`
    );
  },

  async render(
    id: string,
    variables: Record<string, any>
  ): Promise<ApiResponse<RenderTemplateResponse>> {
    return await apiClient.doc.post(`/api/templates/${id}/render`, {
      variables,
    });
  },

  async duplicate(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.post(`/api/templates/${id}/duplicate`);
  },

  async toggleStatus(id: string): Promise<ApiResponse<Template>> {
    return await apiClient.doc.put(`/api/templates/${id}/toggle-status`);
  },
};
