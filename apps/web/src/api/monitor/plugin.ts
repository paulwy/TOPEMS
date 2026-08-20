import apiClient from '../client';
import type { ApiResponse } from '../client';

interface PluginHealth {
  plugin_id: string;
  plugin_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime?: string;
  last_check?: string;
  latency_ms?: number;
  error_count?: number;
  details?: Record<string, unknown>;
}

interface PluginInfo {
  id: string;
  name: string;
  display_name?: string;
  version: string;
  description?: string;
  author?: string;
  type?: string;
  capabilities?: string[];
  installed_at?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export const pluginApi = {
  health: (): Promise<ApiResponse<PluginHealth[]>> => {
    return apiClient.monitor.get('/plugins/health');
  },

  info: (): Promise<ApiResponse<PluginInfo[]>> => {
    return apiClient.monitor.get('/plugins/info');
  },
};

export default pluginApi;
