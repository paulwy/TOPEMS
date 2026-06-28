import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  IncomingInspection,
  CreateIncomingInspectionRequest,
  UpdateIncomingInspectionRequest,
  IncomingInspectionQueryParams,
  InspectionDisposalRequest,
} from './types';

export const incomingInspectionApi = {
  list: async (
    params?: IncomingInspectionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<IncomingInspection>>> => {
    return apiClient.scm.get('/api/scm/incoming-inspections', { params });
  },

  create: async (
    data: CreateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post('/api/scm/incoming-inspections', data);
  },

  get: async (id: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.get(`/api/scm/incoming-inspections/${id}`);
  },

  update: async (
    id: string,
    data: UpdateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.put(`/api/scm/incoming-inspections/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/incoming-inspections/${id}`);
  },

  pass: async (id: string, remarks?: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/api/scm/incoming-inspections/${id}/pass`, { remarks });
  },

  reject: async (
    id: string,
    data: InspectionDisposalRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/api/scm/incoming-inspections/${id}/reject`, data);
  },
};
