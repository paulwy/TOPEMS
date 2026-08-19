import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SystemConfig, CacheConfig, LogConfig, SystemParams } from './types';

export const systemParamsApi = {
  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    return apiClient.core.get('/system/v1/config');
  },

  async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    return apiClient.core.put('/system/v1/config', data);
  },

  async getCacheConfig(): Promise<ApiResponse<CacheConfig>> {
    return apiClient.core.get('/system/v1/cache/config');
  },

  async updateCacheConfig(data: Partial<CacheConfig>): Promise<ApiResponse<CacheConfig>> {
    return apiClient.core.put('/system/v1/cache/config', data);
  },

  async clearCache(): Promise<ApiResponse<{ cleared: boolean; message: string }>> {
    return apiClient.core.post('/system/v1/cache/clear');
  },

  async getCacheStats(): Promise<
    ApiResponse<{
      keys_count: number;
      memory_used_mb: number;
      hit_rate: number;
    }>
  > {
    return apiClient.core.get('/system/v1/cache/stats');
  },

  async getLogConfig(): Promise<ApiResponse<LogConfig>> {
    return apiClient.core.get('/system/v1/log/config');
  },

  async updateLogConfig(data: Partial<LogConfig>): Promise<ApiResponse<LogConfig>> {
    return apiClient.core.put('/system/v1/log/config', data);
  },

  async getSystemParams(): Promise<ApiResponse<SystemParams>> {
    return apiClient.core.get('/system/v1/params');
  },

  async updateSystemParams(data: Partial<SystemParams>): Promise<ApiResponse<SystemParams>> {
    return apiClient.core.put('/system/v1/params', data);
  },
};

export default systemParamsApi;
