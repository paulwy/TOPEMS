import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Driver,
  CreateDriverRequest,
  UpdateDriverRequest,
  ApprovalRequest,
  ApprovalResponse,
  PaginationParams,
} from './types';

export const driverApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Driver>>> => {
    return apiClient.tms.get('/drivers', { params });
  },

  get: async (id: string): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.get(`/drivers/${id}`);
  },

  create: async (data: CreateDriverRequest): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.post('/drivers', data);
  },

  update: async (id: string, data: UpdateDriverRequest): Promise<ApiResponse<Driver>> => {
    return apiClient.tms.put(`/drivers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/drivers/${id}`);
  },

  // ---- FSM Approval Endpoints ----

  /** Submit driver for verification (active -> suspended) */
  submitVerification: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/drivers/${id}/submit-verification`, body);
  },

  /** Approve driver (suspended -> active) */
  approve: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/drivers/${id}/approve`, body);
  },

  /** Reject driver (suspended -> inactive) */
  reject: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/drivers/${id}/reject`, body);
  },
};

export default driverApi;
