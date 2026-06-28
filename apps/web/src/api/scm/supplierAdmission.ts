import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SupplierAdmission,
  CreateSupplierAdmissionRequest,
  UpdateSupplierAdmissionRequest,
  SupplierAdmissionQueryParams,
} from './types';

export const supplierAdmissionApi = {
  list: async (
    params?: SupplierAdmissionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierAdmission>>> => {
    return apiClient.scm.get('/api/scm/supplier-admissions', { params });
  },

  create: async (
    data: CreateSupplierAdmissionRequest
  ): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post('/api/scm/supplier-admissions', data);
  },

  get: async (id: string): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.get(`/api/scm/supplier-admissions/${id}`);
  },

  update: async (
    id: string,
    data: UpdateSupplierAdmissionRequest
  ): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.put(`/api/scm/supplier-admissions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/supplier-admissions/${id}`);
  },

  submit: async (id: string, remarks?: string): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post(`/api/scm/supplier-admissions/${id}/submit`, { remarks });
  },

  approve: async (id: string, remarks?: string): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post(`/api/scm/supplier-admissions/${id}/approve`, { remarks });
  },

  reject: async (id: string, remarks?: string): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post(`/api/scm/supplier-admissions/${id}/reject`, { remarks });
  },

  audit: async (
    id: string,
    auditData: { audit_items: Array<{ audit_item: string; audit_result: string; remarks?: string }> }
  ): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post(`/api/scm/supplier-admissions/${id}/audit`, auditData);
  },

  activateSupplier: async (id: string): Promise<ApiResponse<SupplierAdmission>> => {
    return apiClient.scm.post(`/api/scm/supplier-admissions/${id}/activate-supplier`);
  },
};
