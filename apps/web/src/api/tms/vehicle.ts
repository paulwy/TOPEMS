import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  ApprovalRequest,
  ApprovalResponse,
  PaginationParams,
} from './types';

export const vehicleApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Vehicle>>> => {
    return apiClient.tms.get('/vehicles', { params });
  },

  get: async (id: string): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.get(`/vehicles/${id}`);
  },

  create: async (data: CreateVehicleRequest): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.post('/vehicles', data);
  },

  update: async (id: string, data: UpdateVehicleRequest): Promise<ApiResponse<Vehicle>> => {
    return apiClient.tms.put(`/vehicles/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/vehicles/${id}`);
  },

  // ---- FSM Approval Endpoints ----

  /** Submit vehicle for maintenance inspection (active -> maintenance) */
  submitInspection: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/vehicles/${id}/submit-inspection`, body);
  },

  /** Approve vehicle (maintenance -> active or inactive -> retired) */
  approve: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/vehicles/${id}/approve`, body);
  },

  /** Reject vehicle maintenance (maintenance -> active, revert) */
  reject: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/vehicles/${id}/reject`, body);
  },
};

export default vehicleApi;
