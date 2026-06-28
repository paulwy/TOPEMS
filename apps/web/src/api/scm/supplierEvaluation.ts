import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SupplierEvaluation,
  CreateSupplierEvaluationRequest,
  UpdateSupplierEvaluationRequest,
  SupplierEvaluationQueryParams,
} from './types';

export const supplierEvaluationApi = {
  list: async (
    params?: SupplierEvaluationQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierEvaluation>>> => {
    return apiClient.scm.get('/api/scm/evaluations', { params });
  },

  create: async (
    data: CreateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.post('/api/scm/evaluations', data);
  },

  get: async (id: string): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.get(`/api/scm/evaluations/${id}`);
  },

  update: async (
    id: string,
    data: UpdateSupplierEvaluationRequest
  ): Promise<ApiResponse<SupplierEvaluation>> => {
    return apiClient.scm.put(`/api/scm/evaluations/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/api/scm/evaluations/${id}`);
  },
};
