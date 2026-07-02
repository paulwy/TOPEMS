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
    return apiClient.scm.get('/incoming-inspections', { params });
  },

  create: async (
    data: CreateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post('/incoming-inspections', data);
  },

  get: async (id: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.get(`/incoming-inspections/${id}`);
  },

  update: async (
    id: string,
    data: UpdateIncomingInspectionRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.put(`/incoming-inspections/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/incoming-inspections/${id}`);
  },

  pass: async (id: string, remarks?: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/incoming-inspections/${id}/pass`, { remarks });
  },

  reject: async (
    id: string,
    data: InspectionDisposalRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/incoming-inspections/${id}/reject`, data);
  },
};
