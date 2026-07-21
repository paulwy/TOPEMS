import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from '@topems/shared-types';
import { apiLogger } from '../../utils/logger';
import type { CrudOperations } from '@/hooks/useCrudQueries';

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  uptime: number;
  timestamp: string;
}

export interface ServiceHealth {
  id?: string;
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime?: string;
  response_time?: number;
  latency?: number;
  error_rate?: number;
  last_check?: string;
  last_checked?: string;
  uptime_percentage?: number;
}

export interface ApiPerformance {
  endpoint: string;
  method: string;
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  throughput: number;
}

export interface DatabaseMetrics {
  connections: number;
  max_connections: number;
  query_count: number;
  slow_query_count: number;
  avg_query_time: number;
  cache_hit_rate: number;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  service_name: string;
  status: 'active' | 'resolved' | 'acknowledged';
  created_at: string;
  resolved_at?: string;
  acknowledged_at?: string;
}

export interface AlertQueryParams {
  page?: number;
  pagesize?: number;
  severity?: string;
  status?: string;
  service_name?: string;
}

export interface PerformanceReport {
  period: string;
  period_type: 'hourly' | 'daily' | 'weekly';
  metrics: {
    avg_cpu: number;
    avg_memory: number;
    avg_latency: number;
    total_requests: number;
    totalerrors: number;
    uptime: number;
  };
  services: ServiceHealth[];
  top_endpoints: ApiPerformance[];
  alerts: Alert[];
  generated_at: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 100,
  maxDelay: 500,
};

const isRetryableError = (error: unknown): boolean => {
  if (!error) return false;

  const axiosError = error as {
    response?: { status: number };
    code?: string;
    message?: string;
  };

  if (axiosError.code === 'ERR_NETWORK') {
    return true;
  }

  if (
    axiosError.code === 'ECONNABORTED' ||
    (axiosError.message && axiosError.message.includes('timeout'))
  ) {
    return true;
  }

  const status = axiosError.response?.status;
  if (status && (status >= 500 || status === 429)) {
    return true;
  }

  return false;
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
        apiLogger.debug(
          `[Monitor API] Retrying ${context || 'request'} (attempt ${attempt}/${config.maxRetries}), delaying ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        apiLogger.debug(
          `[Monitor API] Non-retryable error for ${context || 'request'}, skipping retries`
        );
        throw error;
      }
      apiLogger.warn(
        `[Monitor API] ${context || 'request'} failed (attempt ${attempt}/${config.maxRetries}):`,
        error
      );
    }
  }

  apiLogger.error(
    `[Monitor API] ${context || 'request'} failed after ${config.maxRetries} retries`
  );
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown error'));
};

export const monitorApi = {
  getSystemMetrics: async (): Promise<ApiResponse<SystemMetrics>> => {
    return withRetry(
      () => apiClient.monitor.get<SystemMetrics>('/metrics/system'),
      DEFAULT_RETRY_CONFIG,
      'getSystemMetrics'
    );
  },

  getServiceHealth: async (): Promise<ApiResponse<ServiceHealth[]>> => {
    return withRetry(
      () => apiClient.monitor.get<ServiceHealth[]>('/health'),
      DEFAULT_RETRY_CONFIG,
      'getServiceHealth'
    );
  },

  getApiPerformance: async (): Promise<ApiResponse<ApiPerformance[]>> => {
    return withRetry(
      () => apiClient.monitor.get<ApiPerformance[]>('/performance/api'),
      DEFAULT_RETRY_CONFIG,
      'getApiPerformance'
    );
  },

  getDatabaseMetrics: async (): Promise<ApiResponse<DatabaseMetrics>> => {
    return withRetry(
      () => apiClient.monitor.get<DatabaseMetrics>('/metrics/database'),
      DEFAULT_RETRY_CONFIG,
      'getDatabaseMetrics'
    );
  },

  listAlerts: async (params?: AlertQueryParams): Promise<ApiResponse<PaginatedResponse<Alert>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.service_name) queryParams.append('service_name', params.service_name);

    return withRetry(
      () =>
        apiClient.monitor.get<PaginatedResponse<Alert>>(`/alerts?${queryParams.toString()}`),
      DEFAULT_RETRY_CONFIG,
      'listAlerts'
    );
  },

  getAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return withRetry(
      () => apiClient.monitor.get<Alert>(`/alerts/${id}`),
      DEFAULT_RETRY_CONFIG,
      `getAlert(${id})`
    );
  },

  acknowledgeAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return withRetry(
      () => apiClient.monitor.put<Alert>(`/alerts/${id}/acknowledge`),
      DEFAULT_RETRY_CONFIG,
      `acknowledgeAlert(${id})`
    );
  },

  resolveAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return withRetry(
      () => apiClient.monitor.put<Alert>(`/alerts/${id}/resolve`),
      DEFAULT_RETRY_CONFIG,
      `resolveAlert(${id})`
    );
  },

  getPerformanceReport: async (
    periodType?: 'hourly' | 'daily' | 'weekly',
    period?: string
  ): Promise<ApiResponse<PerformanceReport>> => {
    const queryParams = new URLSearchParams();
    if (periodType) queryParams.append('period_type', periodType);
    if (period) queryParams.append('period', period);

    return withRetry(
      () =>
        apiClient.monitor.get<PerformanceReport>(
          `/reports/performance?${queryParams.toString()}`
        ),
      DEFAULT_RETRY_CONFIG,
      'getPerformanceReport'
    );
  },

  getRealtimeMetrics: async (): Promise<ApiResponse<SystemMetrics>> => {
    return withRetry(
      () => apiClient.monitor.get<SystemMetrics>('/metrics/realtime'),
      DEFAULT_RETRY_CONFIG,
      'getRealtimeMetrics'
    );
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.monitor.get<string>('/health');
  },

  testRetry: async (): Promise<ApiResponse<SystemMetrics>> => {
    return withRetry(
      () => apiClient.monitor.get<SystemMetrics>('/metrics/test-retry'),
      DEFAULT_RETRY_CONFIG,
      'testRetry'
    );
  },
};

export default monitorApi;

export const alertCrudApi: CrudOperations<Alert, AlertQueryParams> = {
  list: (params?) =>
    monitorApi.listAlerts({
      page: params?.page,
      pagesize: params?.pagesize,
      ...(params as unknown as Record<string, unknown>),
    }) as Promise<{
      success: boolean;
      code: number;
      message: string;
      data?: { items: Alert[]; total: number; page?: number; pagesize?: number };
    }>,
  get: monitorApi.getAlert as (
    id: string
  ) => Promise<{ success: boolean; code: number; message: string; data?: Alert }>,
  create: (() => {
    throw new Error('Not implemented');
  }) as unknown as CrudOperations<Alert, AlertQueryParams>['create'],
  update: (() => {
    throw new Error('Not implemented');
  }) as unknown as CrudOperations<Alert, AlertQueryParams>['update'],
  delete: (() => {
    throw new Error('Not implemented');
  }) as unknown as CrudOperations<Alert, AlertQueryParams>['delete'],
};
