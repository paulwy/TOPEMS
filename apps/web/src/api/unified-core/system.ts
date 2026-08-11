import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';

export interface ApiKey {
  id: string;
  name: string;
  key?: string;
  key_prefix?: string;
  permissions?: string[];
  created_at?: string;
  last_used_at?: string;
  status?: 'active' | 'inactive';
}

export interface AuditLog {
  id: string;
  action: string;
  module?: string;
  user_id?: string;
  user_name?: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CacheConfig {
  provider: 'redis' | 'memory' | 'memcached';
  host?: string;
  port?: number;
  ttl_seconds?: number;
  max_entries?: number;
}

export interface CacheStats {
  total_keys: number;
  hit_rate: number;
  memory_used_bytes: number;
  evicted_keys: number;
  uptime_seconds: number;
}

export interface SystemConfig {
  site_name?: string;
  site_url?: string;
  logo_url?: string;
  timezone?: string;
  locale?: string;
  max_upload_size?: number;
  session_timeout_minutes?: number;
  [key: string]: unknown;
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  output: 'stdout' | 'file' | 'syslog';
  file_path?: string;
  max_size_mb?: number;
  rotate_count?: number;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from_email: string;
  from_name?: string;
  use_tls?: boolean;
}

export interface SystemParam {
  key: string;
  value: string;
  description?: string;
  category?: string;
  updated_at?: string;
}

export const systemApi = {
  listApiKeys: (): Promise<ApiResponse<ApiKey[]>> => {
    return apiClient.core.get('/api/core/system/api-keys');
  },

  createApiKey: (data: { name: string; permissions?: string[] }): Promise<ApiResponse<ApiKey>> => {
    return apiClient.core.post('/api/core/system/api-keys', data);
  },

  getApiKey: (id: string): Promise<ApiResponse<ApiKey>> => {
    return apiClient.core.get(`/api/core/system/api-keys/${id}`);
  },

  updateApiKey: (id: string, data: Partial<ApiKey>): Promise<ApiResponse<ApiKey>> => {
    return apiClient.core.put(`/api/core/system/api-keys/${id}`, data);
  },

  deleteApiKey: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.core.delete(`/api/core/system/api-keys/${id}`);
  },

  listAuditLogs: (params?: {
    action?: string;
    module?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<AuditLog[]>> => {
    return apiClient.core.get('/api/core/system/audit-logs', { params });
  },

  exportAuditLogs: (params?: {
    action?: string;
    module?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    format?: 'csv' | 'json' | 'xlsx';
  }): Promise<Blob> => {
    return downloadBlob('core', '/api/core/system/audit-logs/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  getAuditLog: (id: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.core.get(`/api/core/system/audit-logs/${id}`);
  },

  clearCache: (data?: { pattern?: string }): Promise<ApiResponse<{ cleared_count: number }>> => {
    return apiClient.core.post('/api/core/system/cache/clear', data || {});
  },

  getCacheConfig: (): Promise<ApiResponse<CacheConfig>> => {
    return apiClient.core.get('/api/core/system/cache/config');
  },

  updateCacheConfig: (data: Partial<CacheConfig>): Promise<ApiResponse<CacheConfig>> => {
    return apiClient.core.put('/api/core/system/cache/config', data);
  },

  getCacheStats: (): Promise<ApiResponse<CacheStats>> => {
    return apiClient.core.get('/api/core/system/cache/stats');
  },

  getConfig: (): Promise<ApiResponse<SystemConfig>> => {
    return apiClient.core.get('/api/core/system/config');
  },

  updateConfig: (data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> => {
    return apiClient.core.put('/api/core/system/config', data);
  },

  getLogConfig: (): Promise<ApiResponse<LogConfig>> => {
    return apiClient.core.get('/api/core/system/log/config');
  },

  updateLogConfig: (data: Partial<LogConfig>): Promise<ApiResponse<LogConfig>> => {
    return apiClient.core.put('/api/core/system/log/config', data);
  },

  listParams: (params?: { category?: string; keyword?: string }): Promise<ApiResponse<SystemParam[]>> => {
    return apiClient.core.get('/api/core/system/params', { params });
  },

  updateParams: (data: Record<string, string>): Promise<ApiResponse<SystemParam[]>> => {
    return apiClient.core.put('/api/core/system/params', data);
  },

  getSmtpSettings: (): Promise<ApiResponse<SmtpSettings>> => {
    return apiClient.core.get('/api/core/system/settings/smtp');
  },

  updateSmtpSettings: (data: Partial<SmtpSettings>): Promise<ApiResponse<SmtpSettings>> => {
    return apiClient.core.put('/api/core/system/settings/smtp', data);
  },
};

export default systemApi;