import { apiClient, ApiResponse } from './client';

export interface InspectionTask {
  id: string;
  sample_id: string;
  process_id: string;
  current_step: number;
  status: string;
  inspector: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionTaskRequest {
  sample_id: string;
  process_id: string;
  inspector: string;
}

export interface UpdateInspectionTaskRequest {
  sample_id?: string;
  process_id?: string;
  inspector?: string;
  status?: string;
}

export interface CompleteStepRequest {
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
}

export const inspectionTaskApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; status?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/tasks', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<InspectionTask>>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateInspectionTaskRequest) => {
    const response = await apiClient.post<ApiResponse<InspectionTask>>('/api/v1/tasks', data);
    return response.data;
  },

  update: async (id: string, data: UpdateInspectionTaskRequest) => {
    const response = await apiClient.put<ApiResponse<InspectionTask>>(`/api/v1/tasks/${id}`, data);
    return response.data;
  },

  completeStep: async (id: string, data: CompleteStepRequest) => {
    const response = await apiClient.post<ApiResponse<InspectionTask>>(`/api/v1/tasks/${id}/complete_step`, data);
    return response.data;
  },
};
