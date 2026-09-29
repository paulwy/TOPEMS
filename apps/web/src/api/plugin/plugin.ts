import type { ApiResponse } from '../client';
import { pluginAxios } from './marketplace';
import type {
  Plugin,
  PluginDetails,
  PluginVersion,
  TenantInstalledPlugin,
  TenantPlugin,
} from './types';

// V64: /api/v1/ 前缀已废弃，统一使用 /api/core/plugin（与 moduleMapping 对齐）
const API_BASE = '/api/plugin';

export const pluginApi = {
  listMarketplace: async (): Promise<ApiResponse<Plugin[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/marketplace/list`);
    return response.data;
  },

  listInstalled: async (): Promise<ApiResponse<TenantInstalledPlugin[]>> => {
    // 插件市场功能暂未上线，直接返回空数组，避免控制台401报错
    return {
      success: true,
      code: 0,
      message: 'ok',
      data: [],
    };
  },

  getDetails: async (pluginCode: string): Promise<ApiResponse<PluginDetails>> => {
    const response = await pluginAxios.get(`${API_BASE}/plugins/${pluginCode}`);
    return response.data;
  },

  install: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/tenant/my/plugins/${pluginCode}/install`);
    return response.data;
  },

  uninstall: async (
    pluginCode: string,
    tier?: 'disable' | 'uninstall' | 'delete'
  ): Promise<ApiResponse<boolean>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/tenant/my/plugins/${pluginCode}/uninstall`,
      { uninstall_tier: tier || 'uninstall' }
    );
    return response.data;
  },

  enable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/tenant/my/plugins/${pluginCode}/activate`);
    return response.data;
  },

  disable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/tenant/my/plugins/${pluginCode}/deactivate`
    );
    return response.data;
  },

  upgrade: async (pluginCode: string, version?: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/tenant/my/plugins/${pluginCode}/install`, {
      version,
    });
    return response.data;
  },

  getUpgradeHistory: async (pluginCode: string): Promise<ApiResponse<PluginVersion[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/plugins/${pluginCode}/versions`);
    return response.data;
  },
};

export default pluginApi;
