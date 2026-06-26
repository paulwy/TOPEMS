import type { ApiResponse } from '../client';
import { pluginAxios } from './marketplace';
import type {
  Plugin,
  PluginDetails,
  PluginVersion,
  TenantInstalledPlugin,
  TenantPlugin,
} from './types';

const API_BASE = '/api/core/plugins';

export const pluginApi = {
  listMarketplace: async (): Promise<ApiResponse<Plugin[]>> => {
    const response = await pluginAxios.get(API_BASE);
    return response.data;
  },

  listInstalled: async (): Promise<ApiResponse<TenantInstalledPlugin[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/my`);
    return response.data;
  },

  getDetails: async (pluginCode: string): Promise<ApiResponse<PluginDetails>> => {
    const response = await pluginAxios.get(`${API_BASE}/${pluginCode}`);
    return response.data;
  },

  install: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/install`);
    return response.data;
  },

  uninstall: async (pluginCode: string): Promise<ApiResponse<boolean>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/uninstall`);
    return response.data;
  },

  enable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/enable`);
    return response.data;
  },

  disable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/disable`);
    return response.data;
  },

  upgrade: async (pluginCode: string, version?: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/upgrade`, { version });
    return response.data;
  },

  getUpgradeHistory: async (pluginCode: string): Promise<ApiResponse<PluginVersion[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/${pluginCode}/upgrade-history`);
    return response.data;
  },
};

export default pluginApi;
