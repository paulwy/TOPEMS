import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  IncomingInspection,
  CreateIncomingInspectionRequest,
  UpdateIncomingInspectionRequest,
  IncomingInspectionQueryParams,
  InspectionDisposalRequest,
  IncomingNotice,
  CreateIncomingNoticeRequest,
  UpdateIncomingNoticeRequest,
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

  pass: async (id: string, remarks?: string): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/incoming-inspections/${id}/pass`, { remarks });
  },

  reject: async (
    id: string,
    data: InspectionDisposalRequest
  ): Promise<ApiResponse<IncomingInspection>> => {
    return apiClient.scm.post(`/incoming-inspections/${id}/reject`, data);
  },

  // ── 到货通知（/incoming-notices）──
  listNotices: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<IncomingNotice>>> => {
    return apiClient.scm.get('/incoming-notices', { params });
  },

  createNotice: async (data: CreateIncomingNoticeRequest): Promise<ApiResponse<IncomingNotice>> => {
    return apiClient.scm.post('/incoming-notices', data);
  },

  getNotice: async (id: string): Promise<ApiResponse<IncomingNotice>> => {
    return apiClient.scm.get(`/incoming-notices/${id}`);
  },

  updateNotice: async (
    id: string,
    data: UpdateIncomingNoticeRequest
  ): Promise<ApiResponse<IncomingNotice>> => {
    return apiClient.scm.put(`/incoming-notices/${id}`, data);
  },
};
