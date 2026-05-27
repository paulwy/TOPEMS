import { apiClient, ApiResponse } from './client';

export interface Formula {
  id: string;
  name: string;
  code: string;
  version: number;
  description?: string;
  project_id?: string;
  status: string;
  ingredients: any[];
  process_params: any;
  properties: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFormulaRequest {
  name: string;
  code: string;
  description?: string;
  project_id?: string;
  ingredients: any[];
  process_params?: any;
  properties?: any;
}

export interface UpdateFormulaRequest {
  name?: string;
  description?: string;
  status?: string;
  ingredients?: any[];
  process_params?: any;
  properties?: any;
}

export interface FormulaListResponse {
  formulas: Formula[];
  total: number;
  page: number;
  page_size: number;
}

export const formulaApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    project_id?: string;
  }): Promise<ApiResponse<FormulaListResponse>> => {
    const response = await apiClient.get<ApiResponse<FormulaListResponse>>(
      '/api/v1/formulas',
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Formula>> => {
    const response = await apiClient.get<ApiResponse<Formula>>(
      `/api/v1/formulas/${id}`
    );
    return response.data;
  },

  create: async (data: CreateFormulaRequest): Promise<ApiResponse<Formula>> => {
    const response = await apiClient.post<ApiResponse<Formula>>(
      '/api/v1/formulas',
      data
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateFormulaRequest
  ): Promise<ApiResponse<Formula>> => {
    const response = await apiClient.put<ApiResponse<Formula>>(
      `/api/v1/formulas/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    const response = await apiClient.delete<ApiResponse<string>>(
      `/api/v1/formulas/${id}`
    );
    return response.data;
  },

  getVersions: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/api/v1/formulas/${id}/versions`
    );
    return response.data;
  },
};
