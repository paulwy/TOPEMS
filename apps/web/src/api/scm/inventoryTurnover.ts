import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  InventoryTurnoverStat,
  InventoryTurnoverQueryParams,
  AbcClassification,
  AbcClassificationQueryParams,
  TurnoverTrendData,
  TurnoverTrendQueryParams,
} from './types';

export const inventoryTurnoverApi = {
  list: async (
    params?: InventoryTurnoverQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InventoryTurnoverStat>>> => {
    return apiClient.scm.get('/inventory-turnover', { params });
  },

  get: async (id: string): Promise<ApiResponse<InventoryTurnoverStat>> => {
    return apiClient.scm.get(`/inventory-turnover/${id}`);
  },

  abcClassification: async (
    params?: AbcClassificationQueryParams
  ): Promise<ApiResponse<AbcClassification[]>> => {
    return apiClient.scm.get('/inventory-turnover/abc-analysis', { params });
  },

  trend: async (params?: TurnoverTrendQueryParams): Promise<ApiResponse<TurnoverTrendData[]>> => {
    return apiClient.scm.get('/inventory-turnover/trend', { params });
  },
};
