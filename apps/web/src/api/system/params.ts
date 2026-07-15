import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SystemConfig, CacheConfig, LogConfig, SystemParams } from './types';

export const systemParamsApi = {
  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    return apiClient.core.get('/system/config');
  },

  async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    return apiClient.core.put('/system/config', data);
  },

  async getCacheConfig(): Promise<ApiResponse<CacheConfig>> {
    return apiClient.core.get('/system/cache/config');
  },

  async updateCacheConfig(data: Partial<CacheConfig>): Promise<ApiResponse<CacheConfig>> {
    return apiClient.core.put('/system/cache/config', data);
  },

  async clearCache(): Promise<ApiResponse<{ cleared: boolean; message: string }>> {
    return apiClient.core.post('/system/cache/clear');
  },

  async getCacheStats(): Promise<
    ApiResponse<{
      keys_count: number;
      memory_used_mb: number;
      hit_rate: number;
    }>
  > {
    return apiClient.core.get('/system/cache/stats');
  },

  async getLogConfig(): Promise<ApiResponse<LogConfig>> {
    return apiClient.core.get('/system/log/config');
  },

  async updateLogConfig(data: Partial<LogConfig>): Promise<ApiResponse<LogConfig>> {
    return apiClient.core.put('/system/log/config', data);
  },

  async getSystemParams(): Promise<ApiResponse<SystemParams>> {
    return apiClient.core.get('/system/params');
  },

  async updateSystemParams(data: Partial<SystemParams>): Promise<ApiResponse<SystemParams>> {
    return apiClient.core.put('/system/params', data);
  },
};

export default systemParamsApi;
