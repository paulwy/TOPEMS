import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface MetricsSnapshot {
  timestamp: string;
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
  };
  services: Array<{
    name: string;
    status: string;
    latency_ms: number;
    error_rate: number;
  }>;
  database: {
    connections: number;
    active_queries: number;
    slow_queries: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
  };
}

export const metricsSnapshotApi = {
  getSnapshot: (): Promise<ApiResponse<MetricsSnapshot>> => {
    return apiClient.monitor.get('/metrics/snapshot');
  },
};

export default metricsSnapshotApi;