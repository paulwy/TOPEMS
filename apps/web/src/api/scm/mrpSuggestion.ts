import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  MrpSuggestion,
  MrpSuggestionQueryParams,
  MrpSuggestionListResponse,
  MrpMaterialSummaryQueryParams,
  MrpMaterialSummaryListResponse,
} from './types';

export const mrpSuggestionApi = {
  list: async (
    params?: MrpSuggestionQueryParams
  ): Promise<ApiResponse<MrpSuggestionListResponse>> => {
    return apiClient.scm.get('/mrp-suggestions', { params });
  },

  get: async (id: string): Promise<ApiResponse<MrpSuggestion>> => {
    return apiClient.scm.get(`/mrp-suggestions/${id}`);
  },

  summary: async (
    params?: MrpMaterialSummaryQueryParams
  ): Promise<ApiResponse<MrpMaterialSummaryListResponse>> => {
    return apiClient.scm.get('/mrp-suggestions/summary', { params });
  },
};
