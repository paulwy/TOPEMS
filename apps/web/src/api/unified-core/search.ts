import apiClient from '../client';
import type { ApiResponse } from '../client';

export const unifiedSearchApi = {
  search: (params?: {
    q: string;
    type?: string;
    scope?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<import('../shared').SearchResult[]>> => {
    return apiClient.core.get('/api/core/search', { params });
  },

  getRecent: (params?: {
    limit?: number;
  }): Promise<ApiResponse<Array<{ id: string; query: string; created_at: string }>>> => {
    return apiClient.core.get('/api/core/search/recent', { params });
  },

  clearRecent: (): Promise<ApiResponse<void>> => {
    return apiClient.core.delete('/api/core/search/recent');
  },

  getSuggestions: (params?: { q: string; limit?: number }): Promise<ApiResponse<string[]>> => {
    return apiClient.core.get('/api/core/search/suggestions', { params });
  },
};

export default unifiedSearchApi;
