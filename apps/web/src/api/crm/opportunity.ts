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
import {
  toOpenApiParams,
  type AdaptedQuery,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const opportunityApi = {
  /**
   * A4 绑定样板：list_opportunities operation（openapi: GET /crm/opportunities）
   * Query Params: { page, pageSize, search, stage, customerId }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_opportunities'> | OpportunityQueryParams,
  ): Promise<TypedPaginatedResponse<Opportunity>> => {
    return apiClient.crm.get('/opportunities', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  create: async (data: CreateOpportunityRequest): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.post('/opportunities', data);
  },

  get: async (id: string): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.get(`/opportunities/${id}`);
  },

  update: async (id: string, data: UpdateOpportunityRequest): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.put(`/opportunities/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/opportunities/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/opportunities/batch-delete', { ids });
  },

  getFunnel: async (): Promise<ApiResponse<FunnelStage[]>> => {
    return apiClient.crm.get('/opportunities/funnel');
  },

  getStats: async (): Promise<ApiResponse<OpportunityStats>> => {
    return apiClient.crm.get('/opportunities/stats');
  },

  getForecast: async (params?: {
    months?: number;
  }): Promise<ApiResponse<OpportunityForecast[]>> => {
    return apiClient.crm.get('/opportunities/forecast', { params });
  },
};

export default opportunityApi;
