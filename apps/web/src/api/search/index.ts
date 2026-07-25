import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  description?: string;
  highlight_title: string;
  highlight_summary: string;
  service: string;
  service_name: string;
  module?: string;
  result_type: string;
  type_name?: string;
  url: string;
}

export interface SearchResponse {
  total: number;
  by_service: Record<string, number>;
  results: SearchResult[];
  duration_ms: number;
}

export interface SearchSuggestionsResponse {
  suggestions: string[];
}

export const searchApi = {
  async globalSearch(
    query: string,
    limit = 20,
    signal?: AbortSignal
  ): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    searchParams.set('limit', limit.toString());
    return apiClient.portal.get(`/search?${searchParams.toString()}`, { signal });
  },

  async getSuggestions(
    query: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SearchSuggestionsResponse>> {
    return apiClient.portal.get(`/search/suggestions?q=${encodeURIComponent(query)}`, { signal });
  },
};

export default searchApi;
