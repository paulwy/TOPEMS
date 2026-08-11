import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  ConsolidationScope,
  CreateScopeRequest,
  UpdateScopeRequest,
  ScopeQuery,
  ScopeCompany,
  AddScopeCompanyRequest,
  UpdateScopeCompanyRequest,
  ConsolidationPaginatedResponse,
} from './types';

export const consolidationScopeApi = {
  list: (query?: ScopeQuery): Promise<ConsolidationPaginatedResponse<ConsolidationScope>> => {
    return apiClient.erp.get('/consolidation/scopes', {
      params: query ? { ...query, pagesize: query.page_size } : undefined,
    });
  },

  get: (scopeId: string): Promise<ApiResponse<ConsolidationScope>> => {
    return apiClient.erp.get(`/consolidation/scopes/${scopeId}`);
  },

  create: (data: CreateScopeRequest): Promise<ApiResponse<ConsolidationScope>> => {
    return apiClient.erp.post('/consolidation/scopes', data);
  },

  update: (scopeId: string, data: UpdateScopeRequest): Promise<ApiResponse<ConsolidationScope>> => {
    return apiClient.erp.put(`/consolidation/scopes/${scopeId}`, data);
  },

  delete: (scopeId: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/consolidation/scopes/${scopeId}`);
  },
};

export const consolidationScopeCompanyApi = {
  list: (scopeId: string): Promise<ApiResponse<ScopeCompany[]>> => {
    return apiClient.erp.get(`/consolidation/scopes/${scopeId}/companies`);
  },

  add: (data: AddScopeCompanyRequest): Promise<ApiResponse<ScopeCompany>> => {
    return apiClient.erp.post('/consolidation/scopes/companies', data);
  },

  update: (companyId: string, data: UpdateScopeCompanyRequest): Promise<ApiResponse<ScopeCompany>> => {
    return apiClient.erp.put(`/consolidation/scopes/companies/${companyId}`, data);
  },

  remove: (companyId: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/consolidation/scopes/companies/${companyId}`);
  },
};

export default consolidationScopeApi;