import axios from 'axios';
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

const pluginAxios = axios.create({
  baseURL: '',
  timeout: 30000,
});

pluginAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId && !config.headers['X-Tenant-ID']) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

pluginAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('roles');
      localStorage.removeItem('permissions');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

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
