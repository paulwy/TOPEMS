/**
 * IM · 消息搜索与索引 API 绑定
 *
 * 后端: IM 服务 /search/* /indexes/*
 * 路由:
 *   GET    /search/messages
 *   POST   /search/messages/advanced
 *   GET    /search/suggestions
 *   GET    /search/history
 *   DELETE /search/history/{id}
 *   DELETE /search/history
 *   GET    /search/trending
 *   GET    /search/saved-searches
 *   POST   /search/saved-searches
 *   DELETE /search/saved-searches/{id}
 *   GET    /search/indexes/status
 *   POST   /search/indexes/reindex
 *   GET    /search/indexes/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type SearchScope = 'all' | 'channels' | 'direct' | 'groups' | 'files' | 'messages';
export type MessageTypeFilter = 'text' | 'file' | 'image' | 'video' | 'voice' | 'link';
export type SortOrder = 'relevance' | 'date_asc' | 'date_desc';

export interface SearchResult {
  id: string;
  message_id: string;
  channel_id: string;
  channel_name: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: string;
  match_type: 'exact' | 'fuzzy' | 'semantic' | 'highlight';
  match_score: number;
  highlights: string[];
  created_at: string;
  is_edited: boolean;
  has_attachments: boolean;
  reactions_count?: number;
}

export interface AdvancedSearchRequest {
  query: string;
  scope?: SearchScope;
  channel_ids?: string[];
  sender_ids?: string[];
  message_types?: MessageTypeFilter[];
  has_attachments?: boolean;
  has_reactions?: boolean;
  is_bookmarked?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: SortOrder;
  page?: number;
  pagesize?: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'history' | 'contact' | 'channel' | 'bot' | 'command';
  metadata?: Record<string, unknown>;
  score: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  scope?: SearchScope;
  results_count: number;
  created_at: string;
}

export interface TrendingSearch {
  query: string;
  search_count: number;
  trend: number;
  category: 'message' | 'channel' | 'user' | 'bot';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  scope?: SearchScope;
  filters?: AdvancedSearchRequest;
  is_active: boolean;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
}

export interface IndexStatus {
  is_indexing: boolean;
  progress_percent: number;
  indexed_documents: number;
  total_documents: number;
  last_indexed_at?: string;
  next_index_at?: string;
  errors: string[];
}

export interface IndexStats {
  total_messages_indexed: number;
  total_files_indexed: number;
  total_users_indexed: number;
  index_size_bytes: number;
  avg_search_latency_ms: number;
  searches_last_24h: number;
  index_coverage_percent: number;
  by_channel: Array<{ channel_id: string; channel_name: string; indexed_count: number }>;
}

export const imSearchApi = {
  // ==================== 消息搜索 ====================

  searchMessages: async (params: {
    q: string;
    scope?: SearchScope;
    channel_id?: string;
    from?: string;
    to?: string;
    message_type?: MessageTypeFilter;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<SearchResult>>> => {
    return apiClient.im.get('/search/messages', { params });
  },

  advancedSearch: async (
    data: AdvancedSearchRequest
  ): Promise<ApiResponse<PaginatedResponse<SearchResult>>> => {
    return apiClient.im.post('/search/messages/advanced', data);
  },

  // ==================== 搜索建议 ====================

  getSearchSuggestions: async (params: {
    q: string;
    limit?: number;
  }): Promise<ApiResponse<SearchSuggestion[]>> => {
    return apiClient.im.get('/search/suggestions', { params });
  },

  // ==================== 搜索历史 ====================

  getSearchHistory: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SearchHistory[]>> => {
    return apiClient.im.get('/search/history', { params });
  },

  deleteSearchHistory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/search/history/${id}`);
  },

  clearSearchHistory: async (): Promise<ApiResponse<{ cleared: number }>> => {
    return apiClient.im.delete('/search/history');
  },

  // ==================== 热门搜索 ====================

  getTrendingSearches: async (params?: {
    category?: TrendingSearch['category'];
    limit?: number;
  }): Promise<ApiResponse<TrendingSearch[]>> => {
    return apiClient.im.get('/search/trending', { params });
  },

  // ==================== 保存搜索 ====================

  listSavedSearches: async (): Promise<ApiResponse<SavedSearch[]>> => {
    return apiClient.im.get('/search/saved-searches');
  },

  createSavedSearch: async (data: {
    name: string;
    query: string;
    scope?: SearchScope;
    filters?: AdvancedSearchRequest;
  }): Promise<ApiResponse<SavedSearch>> => {
    return apiClient.im.post('/search/saved-searches', data);
  },

  deleteSavedSearch: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/search/saved-searches/${id}`);
  },

  // ==================== 索引管理 ====================

  getIndexStatus: async (): Promise<ApiResponse<IndexStatus>> => {
    return apiClient.im.get('/search/indexes/status');
  },

  triggerReindex: async (data?: {
    scope?: 'all' | 'recent' | 'channel';
    channel_ids?: string[];
  }): Promise<ApiResponse<{ started: boolean; job_id: string }>> => {
    return apiClient.im.post('/search/indexes/reindex', data || {});
  },

  getIndexStats: async (): Promise<ApiResponse<IndexStats>> => {
    return apiClient.im.get('/search/indexes/stats');
  },
};

export default imSearchApi;
