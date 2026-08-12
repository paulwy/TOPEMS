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
import type { OppStage } from '@/schemas/crm';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const opportunityApi = {
  list: async (
    params?: AdaptedQuery<'list_opportunities'> | OpportunityQueryParams,
  ): Promise<TypedPaginatedResponse<Opportunity>> => {
    return apiClient.crm.get('/opportunities', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  create: async (
    data: AdaptedRequestBody<'create_opportunity'> | CreateOpportunityRequest,
  ): Promise<TypedApiResponse<Opportunity, 'create_opportunity'>> => {
    return apiClient.crm.post(
      '/opportunities',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  get: async (id: string): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.get(`/opportunities/${id}`);
  },

  update: async (
    id: string,
    data: UpdateOpportunityRequest,
  ): Promise<ApiResponse<Opportunity>> => {
    return apiClient.crm.put(`/opportunities/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/opportunities/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/opportunities/batch-delete', { ids });
  },

  advance: async (
    id: string,
    data?: { note?: string },
  ): Promise<ApiResponse<{ id: string; fromStage: OppStage; toStage: OppStage }>> => {
    return apiClient.crm.post(
      `/opportunities/${id}/advance`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {},
    );
  },

  rollback: async (
    id: string,
    data?: { note?: string; reason?: string },
  ): Promise<ApiResponse<{ id: string; fromStage: OppStage; toStage: OppStage }>> => {
    return apiClient.crm.post(
      `/opportunities/${id}/rollback`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {},
    );
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
