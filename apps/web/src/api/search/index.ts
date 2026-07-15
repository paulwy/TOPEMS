import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  module: string;
  path: string;
  type_name: string;
}

export const searchApi = {
  async globalSearch(
    query: string,
    limit = 20,
    signal?: AbortSignal
  ): Promise<ApiResponse<SearchResult[]>> {
    return apiClient.core.get('/api/core/search/global', {
      params: { query, limit },
      signal,
    });
  },
};

export default searchApi;
