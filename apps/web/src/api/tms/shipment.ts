import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Shipment,
  CreateShipmentRequest,
  UpdateShipmentRequest,
  ApprovalRequest,
  ApprovalResponse,
  PaginationParams,
} from './types';

export const shipmentApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Shipment>>> => {
    return apiClient.tms.get('/shipments', { params });
  },

  get: async (id: string): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.get(`/shipments/${id}`);
  },

  create: async (data: CreateShipmentRequest): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.post('/shipments', data);
  },

  update: async (id: string, data: UpdateShipmentRequest): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.put(`/shipments/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.tms.delete(`/shipments/${id}`);
  },

  dispatch: async (id: string): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.post(`/shipments/${id}/dispatch`);
  },

  arrive: async (id: string): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.post(`/shipments/${id}/arrive`);
  },

  cancel: async (id: string): Promise<ApiResponse<Shipment>> => {
    return apiClient.tms.post(`/shipments/${id}/cancel`);
  },

  // ---- FSM Approval Endpoints ----

  /** Submit shipment for dispatch approval (draft -> pending) */
  submitApproval: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/shipments/${id}/submit-approval`, body);
  },

  /** Approve shipment dispatch (pending -> in_transit) */
  approve: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/shipments/${id}/approve`, body);
  },

  /** Reject shipment dispatch (pending -> cancelled) */
  reject: async (
    id: string,
    operator: string,
    comment?: string
  ): Promise<ApiResponse<ApprovalResponse>> => {
    const body: ApprovalRequest = { operator, comment };
    return apiClient.tms.post(`/shipments/${id}/reject`, body);
  },
};

export default shipmentApi;
