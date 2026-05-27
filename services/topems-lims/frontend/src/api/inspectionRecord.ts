import { apiClient, ApiResponse } from './client';

export interface InspectionRecord {
  id: string;
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateInspectionRecordRequest {
  task_id: string;
  step_id: string;
  step_name: string;
  result: string;
  conclusion: string;
  inspector: string;
}

export const inspectionRecordApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; conclusion?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/records', { params });
    return response.data;
  },

  listByTask: async (taskId: string) => {
    const response = await apiClient.get<ApiResponse<InspectionRecord[]>>(`/api/v1/records/task/${taskId}`);
    return response.data;
  },

  create: async (data: CreateInspectionRecordRequest) => {
    const response = await apiClient.post<ApiResponse<InspectionRecord>>('/api/v1/records', data);
    return response.data;
  },
};
