import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Patent {
  id: string;
  name: string;
  code: string;
  patent_type: string;
  status: string;
  application_no: string;
  application_date: string;
  publication_no: string;
  publication_date: string;
  inventor: string;
  applicant: string;
  project_id: string;
  project_name: string;
  abstract: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface PatentCreateRequest {
  name: string;
  code: string;
  patent_type: string;
  application_no: string;
  application_date: string;
  inventor: string;
  applicant: string;
  project_id?: string;
  abstract: string;
  description?: string;
}

export interface PatentUpdateRequest {
  name?: string;
  patent_type?: string;
  status?: string;
  publication_no?: string;
  publication_date?: string;
  abstract?: string;
  description?: string;
}

export interface PatentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  project_id?: string;
}

export const patentApi = {
  list: async (params: PatentListParams = {}): Promise<ApiResponse<PaginatedResponse<Patent>>> => {
    const response = await apiClient.get('/api/patents', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Patent>> => {
    const response = await apiClient.get(`/api/patents/${id}`);
    return response.data;
  },

  create: async (data: PatentCreateRequest): Promise<ApiResponse<Patent>> => {
    const response = await apiClient.post('/api/patents', data);
    return response.data;
  },

  update: async (id: string, data: PatentUpdateRequest): Promise<ApiResponse<Patent>> => {
    const response = await apiClient.put(`/api/patents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/api/patents/${id}`);
    return response.data;
  },

  getByProject: async (projectId: string): Promise<ApiResponse<Patent[]>> => {
    const response = await apiClient.get(`/api/patents/project/${projectId}`);
    return response.data;
  },
};