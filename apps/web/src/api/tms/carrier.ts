import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Carrier,
  CreateCarrierRequest,
  UpdateCarrierRequest,
  ApprovalRequest,
  ApprovalResponse,
  PaginationParams,
} from './types';

export const carrierApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Carrier>>> => {
    return apiClient.tms.get('/carriers', { params });
  },

  get: async (id: string): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.get(`/carriers/${id}`);
  },

  create: async (data: CreateCarrierRequest): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.post('/carriers', data);
  },

  update: async (id: string, data: UpdateCarrierRequest): Promise<ApiResponse<Carrier>> => {
    return apiClient.tms.put(`/carriers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/carriers/${id}`);
  },

  // ---- FSM Approval Endpoints ----

  /** Submit carrier for qualification review (no state change, just flag) */
  submitQualification: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/carriers/${id}/submit-qualification`, body);
  },

  /** Approve carrier (pending_review -> active) */
  approve: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/carriers/${id}/approve`, body);
  },

  /** Reject carrier (pending_review -> rejected) */
  reject: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/carriers/${id}/reject`, body);
  },
};

export default carrierApi;
