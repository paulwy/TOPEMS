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

  // ── v74 to_bind 补绑（2026-10-29）──
  registerPlugin: async (
    code: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/runtime/${code}/register`, data);
    return response.data;
  },

  updatePluginStatus: async (
    code: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.put(`${API_BASE}/runtime/${code}/status`, data);
    return response.data;
  },

  getPluginStatus: async (code: string): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.get(`${API_BASE}/runtime/${code}/status`);
    return response.data;
  },

  unregisterPlugin: async (code: string): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/runtime/${code}/unregister`);
    return response.data;
  },

  checkPluginUpdates: async (
    pluginCode: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.get(`${API_BASE}/plugins/${pluginCode}/updates`);
    return response.data;
  },

  rollbackPluginVersion: async (
    pluginCode: string,
    targetVersion: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/plugins/${pluginCode}/rollback/${targetVersion}`
    );
    return response.data;
  },

  checkAllUpdates: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/updates/check-all`);
    return response.data;
  },

  installPlugin: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`/api/plugins/${pluginCode}/install`);
    return response.data;
  },

  uninstallPlugin: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`/api/plugins/${pluginCode}/uninstall`);
    return response.data;
  },

  enablePlugin: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`/api/plugins/${pluginCode}/enable`);
    return response.data;
  },

  disablePlugin: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`/api/plugins/${pluginCode}/disable`);
    return response.data;
  },

  uninstallPluginForTenant: async (
    tenantId: string,
    pluginCode: string
  ): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/tenant/${tenantId}/plugins/${pluginCode}/uninstall`
    );
    return response.data;
  },

  activatePluginForTenant: async (
    tenantId: string,
    pluginCode: string
  ): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/tenant/${tenantId}/plugins/${pluginCode}/activate`
    );
    return response.data;
  },

  uploadPlugin: async (data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/dev/plugins`, data);
    return response.data;
  },

  publishPlugin: async (code: string): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/dev/plugins/${code}/publish`);
    return response.data;
  },

  unpublishPlugin: async (code: string): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.post(`${API_BASE}/dev/plugins/${code}/unpublish`);
    return response.data;
  },

  updatePlugin: async (
    code: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.put(`${API_BASE}/dev/plugins/${code}`, data);
    return response.data;
  },

  // ── v74 to_bind 补绑（2026-10-29，P2）──
  getNavigationConfig: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    const response = await pluginAxios.get('/api/plugin/navigation-config');
    return response.data;
  },
};

export default pluginApi;
