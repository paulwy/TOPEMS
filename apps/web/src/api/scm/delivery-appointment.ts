import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SupplierDeliveryAppointment,
  CreateSupplierDeliveryAppointmentRequest,
  UpdateSupplierDeliveryAppointmentRequest,
  DeliveryAppointmentQueryParams,
  DeliveryAppointmentApprovalRequest,
  DeliveryAppointmentArrivalRequest,
  DeliveryAppointmentCompleteRequest,
  DeliveryAppointmentCancelRequest,
  DeliveryAppointmentStats,
} from './types';

export const deliveryAppointmentApi = {
  list: async (
    params?: DeliveryAppointmentQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierDeliveryAppointment>>> => {
    return apiClient.scm.get('/api/scm/delivery-appointments', { params });
  },

  create: async (
    data: CreateSupplierDeliveryAppointmentRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post('/api/scm/delivery-appointments', data);
  },

  get: async (id: string): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.get(`/api/scm/delivery-appointments/${id}`);
  },

  update: async (
    id: string,
    data: UpdateSupplierDeliveryAppointmentRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.put(`/api/scm/delivery-appointments/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/delivery-appointments/${id}`);
  },

  approve: async (
    id: string,
    data?: DeliveryAppointmentApprovalRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post(`/api/scm/delivery-appointments/${id}/approve`, data || {});
  },

  reject: async (
    id: string,
    data?: DeliveryAppointmentApprovalRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post(`/api/scm/delivery-appointments/${id}/reject`, data || {});
  },

  confirmArrival: async (
    id: string,
    data?: DeliveryAppointmentArrivalRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post(
      `/api/scm/delivery-appointments/${id}/confirm-arrival`,
      data || {}
    );
  },

  complete: async (
    id: string,
    data?: DeliveryAppointmentCompleteRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post(`/api/scm/delivery-appointments/${id}/complete`, data || {});
  },

  cancel: async (
    id: string,
    data?: DeliveryAppointmentCancelRequest
  ): Promise<ApiResponse<SupplierDeliveryAppointment>> => {
    return apiClient.scm.post(`/api/scm/delivery-appointments/${id}/cancel`, data || {});
  },

  stats: async (): Promise<ApiResponse<DeliveryAppointmentStats>> => {
    return apiClient.scm.get('/api/scm/delivery-appointments/stats');
  },
};
