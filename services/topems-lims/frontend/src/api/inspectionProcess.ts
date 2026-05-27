import { apiClient, ApiResponse } from './client';

export interface InspectionStep {
  id: string;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
}

export interface InspectionProcess {
  id: string;
  name: string;
  description: string | null;
  steps: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionProcessRequest {
  name: string;
  description?: string;
  steps: InspectionStep[];
}

export interface UpdateInspectionProcessRequest {
  name?: string;
  description?: string;
  steps?: InspectionStep[];
  status?: string;
}

export const inspectionProcessApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; status?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/processes', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<InspectionProcess>>(`/api/v1/processes/${id}`);
    return response.data;
  },

  create: async (data: CreateInspectionProcessRequest) => {
    const response = await apiClient.post<ApiResponse<InspectionProcess>>('/api/v1/processes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateInspectionProcessRequest) => {
    const response = await apiClient.put<ApiResponse<InspectionProcess>>(`/api/v1/processes/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<any>>(`/api/v1/processes/${id}`);
    return response.data;
  },
};
