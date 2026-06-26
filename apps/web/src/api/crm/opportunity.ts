import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  OpportunityQueryParams,
  FunnelStage,
  OpportunityStats,
  OpportunityForecast,
} from './types';

export const opportunityApi = {
  list: async (
    params?: OpportunityQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Opportunity>>> => {
    return apiClient.crm.get('/api/crm/opportunities', { params });
  },

  create: async (data: CreateOpportunityRequest): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.post('/api/crm/opportunities', data);
  },

  get: async (id: string): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.get(`/api/crm/opportunities/${id}`);
  },

  update: async (id: string, data: UpdateOpportunityRequest): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.put(`/api/crm/opportunities/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/opportunities/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/api/crm/opportunities/batch-delete', { ids });
  },

  getFunnel: async (): Promise<ApiResponse<FunnelStage[]>> => {
    return apiClient.crm.get('/api/crm/opportunities/funnel');
  },

  getStats: async (): Promise<ApiResponse<OpportunityStats>> => {
    return apiClient.crm.get('/api/crm/opportunities/stats');
  },

  getForecast: async (params?: {
    months?: number;
  }): Promise<ApiResponse<OpportunityForecast[]>> => {
    return apiClient.crm.get('/api/crm/opportunities/forecast', { params });
  },
};

export default opportunityApi;
