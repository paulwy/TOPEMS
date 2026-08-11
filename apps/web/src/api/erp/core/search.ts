import apiClient from '../../client';
import type { ApiResponse } from '../../client';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  module: string;
  path: string;
  type_name: string;
}

export interface GlobalSearchParams {
  query: string;
  limit?: number;
}

export const searchApi = {
  async global(params: GlobalSearchParams): Promise<ApiResponse<SearchResult[]>> {
    const sp = new URLSearchParams();
    sp.set('query', params.query);
    if (params.limit) sp.set('limit', params.limit.toString());
    return apiClient.erp.get<SearchResult[]>(`/search/global?${sp.toString()}`);
  },
};
