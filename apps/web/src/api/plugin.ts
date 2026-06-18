/**
 * Plugin API Client
 * 插件市场 API 客户端
 */

import axios from 'axios';
import type { ApiResponse } from './client';

// Plugin types
export interface Plugin {
  id: string;
  code: string;
  name: string;
  description?: string;
  version: string;
  plugin_type: string;
  is_published: boolean;
  category?: string;
  is_free?: boolean;
  price_cents?: number;
  install_count?: number;
  rating?: number;
  rating_count?: number;
  runtime_status?: string;
  runtime_url?: string;
  base_path?: string;
  last_heartbeat?: string;
  author_name?: string;
  is_installed?: boolean;
  is_featured?: boolean;
  tags?: string[];
}

export interface PluginPermission {
  id: string;
  plugin_code: string;
  permission_code: string;
  permission_name?: string;
  resource_type?: string;
  action?: string;
}

export interface PluginDetails {
  plugin: Plugin;
  permissions: PluginPermission[];
}

export interface TenantPlugin {
  id: string;
  tenant_id: string;
  plugin_id: string;
  installed_version: string;
  is_active: boolean;
  license_type: string;
  license_expires_at?: string;
  activated_at?: string;
  last_used_at?: string;
  usage_count: number;
}

export interface PluginWithStatus {
  plugin: Plugin;
  is_owned: boolean;
  tenant_plugin?: TenantPlugin;
}

// Plugin runtime info from /api/plugins/info endpoint
export interface PluginRuntimeInfo {
  code: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  plugin_type: string;
  permissions: Array<{ code: string; name: string; description: string }>;
}

// Plugin runtime configuration
export interface PluginRuntimeConfig {
  port: number;
  health_endpoint: string;
  base_path: string;
}

// Plugin registry - maps plugin code to runtime URL
export const PLUGIN_REGISTRY: Record<string, { url: string; port: number }> = {
  workflow: { url: 'http://localhost:8000', port: 8000 },
  erp: { url: 'http://localhost:8010', port: 8010 },
  hrm: { url: 'http://localhost:8011', port: 8011 },
  crm: { url: 'http://localhost:8012', port: 8012 },
  mes: { url: 'http://localhost:8030', port: 8030 },
  qa: { url: 'http://localhost:8032', port: 8032 },
  scm: { url: 'http://localhost:8040', port: 8040 },
  wms: { url: 'http://localhost:8042', port: 8042 },
  bi: { url: 'http://localhost:8044', port: 8044 },
  pm: { url: 'http://localhost:8046', port: 8046 },
  ai: { url: 'http://localhost:8050', port: 8050 },
  gis: { url: 'http://localhost:8054', port: 8054 },
  mobile: { url: 'http://localhost:8056', port: 8056 },
  rs: { url: 'http://localhost:8058', port: 8058 },
  srm: { url: 'http://localhost:8060', port: 8060 },
  monitor: { url: 'http://localhost:8064', port: 8064 },
  portal: { url: 'http://localhost:8066', port: 8066 },
  integration: { url: 'http://localhost:8068', port: 8068 },
};

// Axios instance for plugin runtime API
const runtimeAxios = axios.create({
  timeout: 5000,
});

// Fetch plugin info directly from plugin runtime
export const fetchPluginInfo = async (code: string): Promise<PluginRuntimeInfo | null> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return null;

  try {
    const response = await runtimeAxios.get(`${config.url}/api/plugins/info`);
    if (response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to fetch plugin info for ${code}:`, error);
    return null;
  }
};

// Fetch all plugin runtime info
export const fetchAllPluginInfo = async (): Promise<PluginRuntimeInfo[]> => {
  const results = await Promise.allSettled(
    Object.keys(PLUGIN_REGISTRY).map(code => fetchPluginInfo(code))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PluginRuntimeInfo> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
};

// Check plugin health
export const checkPluginHealth = async (code: string): Promise<{ healthy: boolean; status?: string }> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return { healthy: false };

  try {
    const response = await runtimeAxios.get(`${config.url}/api/plugins/health`);
    if (response.data?.data?.status) {
      return { healthy: true, status: response.data.data.status };
    }
    return { healthy: true, status: 'running' };
  } catch (error) {
    // Try basic health endpoint
    try {
      const response = await runtimeAxios.get(`${config.url}/health`);
      return { healthy: true, status: 'running' };
    } catch {
      return { healthy: false };
    }
  }
};

// API base path
const API_BASE = '/api/core/plugins';

// Axios instance for plugin API
const pluginAxios = axios.create({
  baseURL: '',
  timeout: 30000,
});

// Add auth token to requests
pluginAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Add tenant ID header
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId && !config.headers['X-Tenant-ID']) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

// Plugin Category type
export interface PluginCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  plugin_count?: number;
  is_active?: boolean;
}

// Plugin Version type
export interface PluginVersion {
  id: string;
  plugin_id: string;
  version: string;
  release_notes?: string;
  is_stable?: boolean;
  is_latest?: boolean;
  download_url?: string;
  checksum?: string;
  file_size?: number;
  min_app_version?: string;
  created_at: string;
}

// Plugin Review type
export interface PluginReview {
  id: string;
  plugin_id: string;
  user_id: string;
  user_name?: string;
  rating?: number;
  title?: string;
  content?: string;
  is_verified_purchase?: boolean;
  is_featured?: boolean;
  helpful_count?: number;
  created_at: string;
}

// Marketplace Summary type
export interface MarketplaceSummary {
  total_plugins: number;
  categories: PluginCategory[];
  featured_plugins: Plugin[];
  new_plugins: Plugin[];
  top_rated: Plugin[];
}

// Plugin List Response
export interface PluginListResponse {
  plugins: Plugin[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Marketplace API
const MARKETPLACE_API = '/api/core/plugin/marketplace';

export const getMarketplaceSummary = async (): Promise<ApiResponse<MarketplaceSummary>> => {
  const response = await pluginAxios.get(MARKETPLACE_API);
  return response.data;
};

export const getPluginCategories = async (): Promise<ApiResponse<PluginCategory[]>> => {
  const response = await pluginAxios.get(`${MARKETPLACE_API}/categories`);
  return response.data;
};

export const listPlugins = async (params?: {
  search?: string;
  category?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<ApiResponse<PluginListResponse>> => {
  const response = await pluginAxios.get(`${MARKETPLACE_API}/list`, { params });
  return response.data;
};

export const getPlugin = async (code: string): Promise<ApiResponse<Plugin>> => {
  const response = await pluginAxios.get(`/api/core/plugin/plugins/${code}`);
  return response.data;
};

export const getPluginVersions = async (code: string): Promise<ApiResponse<PluginVersion[]>> => {
  const response = await pluginAxios.get(`/api/core/plugin/plugins/${code}/versions`);
  return response.data;
};

export const getPluginReviews = async (code: string): Promise<ApiResponse<PluginReview[]>> => {
  const response = await pluginAxios.get(`/api/core/plugin/plugins/${code}/reviews`);
  return response.data;
};

// Plugin API
export const pluginApi = {
  /**
   * Get list of installed plugins
   * GET /api/core/plugins
   */
  listInstalled: async (): Promise<ApiResponse<Plugin[]>> => {
    const response = await pluginAxios.get(API_BASE);
    return response.data;
  },

  /**
   * Get plugin details with permissions
   * GET /api/core/plugins/{plugin_code}
   */
  getDetails: async (pluginCode: string): Promise<ApiResponse<PluginDetails>> => {
    const response = await pluginAxios.get(`${API_BASE}/${pluginCode}`);
    return response.data;
  },

  /**
   * Install a plugin
   * POST /api/core/plugins/{plugin_code}/install
   */
  install: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/install`);
    return response.data;
  },

  /**
   * Uninstall a plugin
   * POST /api/core/plugins/{plugin_code}/uninstall
   */
  uninstall: async (pluginCode: string): Promise<ApiResponse<boolean>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/uninstall`);
    return response.data;
  },

  /**
   * Enable a plugin
   * POST /api/core/plugins/{plugin_code}/enable
   */
  enable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/enable`);
    return response.data;
  },

  /**
   * Disable a plugin
   * POST /api/core/plugins/{plugin_code}/disable
   */
  disable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/disable`);
    return response.data;
  },
};

export default pluginApi;
