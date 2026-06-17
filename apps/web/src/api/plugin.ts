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
