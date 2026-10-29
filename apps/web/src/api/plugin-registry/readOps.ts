import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 plugin-registry 接线 7 条（2026-10-29）：走 apiClient.getClient('plugin-registry')（baseURL /api/plugin）──
const pluginClient = apiClient.getClient('plugin-registry');
export const pluginRegistryReadApi = {
  listUpgradeTasks: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.get('/api/plugin/upgrade/tasks'),
  batchUpgrade: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.post('/api/plugin/upgrade/batch', data ?? {}),
  listPlugins: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.get('/api/plugin/marketplace/list'),
  listCategories: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.get('/api/plugin/marketplace/categories'),
  listMyPlugins: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.get('/api/plugin/tenant/my/plugins'),
  getPlugin: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.get('/api/plugin/plugins/{code}'),
  installPlugin: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    pluginClient.post('/api/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install', data ?? {}),
};