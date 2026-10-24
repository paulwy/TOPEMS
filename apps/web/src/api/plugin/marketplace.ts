import { createBaseAxiosClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  MarketplaceSummary,
  Plugin,
  PluginCategory,
  PluginListResponse,
  PluginReview,
  PluginReviewListResponse,
  PluginVersion,
} from './types';

// V64: /api/v1/ 前缀已废弃，统一使用 /api/plugin/marketplace（与 moduleMapping 对齐）
const MARKETPLACE_API = '/api/plugin/marketplace';

// 收敛共享 client（拍板 A，2026-10-25）：复用主 apiClient 的 axios 工厂
// （token/租户头/Accept-Language/空串清洗/CSRF 统一注入），401 静默语义由
// client.ts isPluginMarketplaceRequest 豁免保留
const pluginAxios = createBaseAxiosClient('');

export const marketplaceApi = {
  getSummary: async (): Promise<ApiResponse<MarketplaceSummary>> => {
    const response = await pluginAxios.get(MARKETPLACE_API);
    return response.data;
  },

  getCategories: async (): Promise<ApiResponse<PluginCategory[]>> => {
    const response = await pluginAxios.get(`${MARKETPLACE_API}/categories`);
    return response.data;
  },

  listPlugins: async (params?: {
    search?: string;
    category?: string;
    sort_by?: 'popular' | 'rating' | 'newest' | 'price';
    sort_order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
    is_free?: boolean;
  }): Promise<ApiResponse<PluginListResponse>> => {
    const response = await pluginAxios.get(`${MARKETPLACE_API}/list`, { params });
    return response.data;
  },

  getPlugin: async (code: string): Promise<ApiResponse<Plugin>> => {
    const response = await pluginAxios.get(`/api/plugin/plugins/${code}`);
    return response.data;
  },

  getVersions: async (code: string): Promise<ApiResponse<PluginVersion[]>> => {
    const response = await pluginAxios.get(`/api/plugin/plugins/${code}/versions`);
    return response.data;
  },

  getReviews: async (
    code: string,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: 'date' | 'helpful' | 'rating';
      sort_order?: 'asc' | 'desc';
      rating_min?: number;
      is_verified?: boolean;
    }
  ): Promise<ApiResponse<PluginReviewListResponse>> => {
    const response = await pluginAxios.get(`/api/plugin/plugins/${code}/reviews`, {
      params,
    });
    return response.data;
  },

  submitReview: async (
    code: string,
    data: {
      rating: number;
      title?: string;
      content?: string;
    }
  ): Promise<ApiResponse<PluginReview>> => {
    const response = await pluginAxios.post(`/api/plugin/plugins/${code}/reviews`, data);
    return response.data;
  },
};

export { pluginAxios };

export default marketplaceApi;
