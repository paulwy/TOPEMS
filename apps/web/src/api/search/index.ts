import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * 全局搜索结果（svc/search /api/search 实际契约）
 *
 * 现行后端返回字段：id / title / description(nullable) / module / path / type_name，
 * 信封为 data.items（见 svc/search/src/models.rs SearchResponse）。
 * 下列 summary / service / result_type / url 等为历史字段，后端已不返回，
 * 保留为可选仅为兼容旧 mock 与过渡期兜底。
 */
export interface SearchResult {
  id: string;
  title: string;
  description?: string | null;
  module: string;
  path: string;
  type_name?: string;
  relevance?: number;
  snippet?: string;
  // ── 历史字段（后端已不下发，可选兜底） ──
  summary?: string;
  highlight_title?: string;
  highlight_summary?: string;
  service?: string;
  service_name?: string;
  result_type?: string;
  url?: string;
}

interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  search_type?: string;
  facets?: Record<string, number>;
  suggestions?: unknown[];
  // ── 历史信封字段（已不下发） ──
  results?: SearchResult[];
  by_service?: Record<string, number>;
  duration_ms?: number;
}

interface SearchSuggestionsResponse {
  suggestions: string[];
}

export const searchApi = {
  async globalSearch(
    query: string,
    limit = 20,
    signal?: AbortSignal
  ): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('keyword', query);
    searchParams.set('page_size', limit.toString());
    // 后端 search 根路由为 /api/search（axum nest 下子路由 "/" 映射到无尾斜杠）
    return apiClient.search.get(`?${searchParams.toString()}`, { signal });
  },

  async getSuggestions(
    query: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SearchSuggestionsResponse>> {
    return apiClient.search.get(`/suggestions?q=${encodeURIComponent(query)}`, { signal });
  },
};

export default searchApi;
