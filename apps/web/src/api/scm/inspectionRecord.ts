import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  InspectionRecord,
  CreateInspectionRecordRequest,
  UpdateInspectionRecordRequest,
} from './types';

export const inspectionRecordApi = {
  list: async (
    inspectionId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionRecord>>> => {
    return apiClient.scm.get(`/api/scm/incoming-inspections/${inspectionId}/records`, { params });
  },

  create: async (data: CreateInspectionRecordRequest): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.post('/api/scm/inspection-records', data);
  },

  get: async (id: string): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.get(`/api/scm/inspection-records/${id}`);
  },

  update: async (
    id: string,
    data: UpdateInspectionRecordRequest
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.scm.put(`/api/scm/inspection-records/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/inspection-records/${id}`);
  },
};
