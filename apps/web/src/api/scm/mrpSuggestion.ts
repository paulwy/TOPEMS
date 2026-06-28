import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  MrpSuggestion,
  MrpSuggestionQueryParams,
  MrpMaterialSummary,
  MrpMaterialSummaryQueryParams,
} from './types';

export const mrpSuggestionApi = {
  list: async (
    params?: MrpSuggestionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<MrpSuggestion>>> => {
    return apiClient.scm.get('/api/scm/mrp-suggestions', { params });
  },

  get: async (id: string): Promise<ApiResponse<MrpSuggestion>> => {
    return apiClient.scm.get(`/api/scm/mrp-suggestions/${id}`);
  },

  summary: async (
    params?: MrpMaterialSummaryQueryParams
  ): Promise<ApiResponse<MrpMaterialSummary[]>> => {
    return apiClient.scm.get('/api/scm/mrp-suggestions/summary', { params });
  },
};
