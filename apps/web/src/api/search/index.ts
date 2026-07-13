import apiClient from '../client';
import type { ApiResponse } from '../client';
import { getMockSearchResults, shouldUseMock, getMockFallback, isDev } from '@/mock/search';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  module: string;
  path: string;
  type_name: string;
}

export const searchApi = {
  async globalSearch(query: string, limit = 20, signal?: AbortSignal): Promise<ApiResponse<SearchResult[]>> {
    // 开发环境直接使用 mock
    if (shouldUseMock()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        success: true,
        code: 200,
        message: 'ok',
        data: getMockSearchResults(query, limit),
        timestamp: Date.now(),
      } as ApiResponse<SearchResult[]>;
    }

    // 正常 API 请求，失败时开发环境自动回退到 mock
    try {
      return await apiClient.erp.get('/search/global', {
        params: { query, limit },
        signal,
      });
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        throw err; // 主动取消的请求不回退
      }
      if (isDev) {
        // 开发环境 API 不可用时回退到 mock 数据
        return {
          success: true,
          code: 200,
          message: 'mock fallback',
          data: getMockFallback(query, limit),
          timestamp: Date.now(),
        } as ApiResponse<SearchResult[]>;
      }
      throw err;
    }
  },
};

export default searchApi;
