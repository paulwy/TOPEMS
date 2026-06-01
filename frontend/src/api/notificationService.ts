import apiClient from './client';
import type { ApiResponse } from './client';

export interface NotificationServiceHealth {
  service_name: string;
  status: string;
  uptime: string;
  dependencies?: Array<{
    name: string;
    status: string;
    message: string;
  }>;
}

export const notificationServiceApi = {
  async health(): Promise<ApiResponse<NotificationServiceHealth>> {
    return apiClient.notification.get<NotificationServiceHealth>('/health');
  },
  
  async detailedHealth(): Promise<ApiResponse<any>> {
    return apiClient.notification.get('/api/v1/health/detailed');
  },
  
  async metrics(): Promise<ApiResponse<any>> {
    return apiClient.notification.get('/api/v1/metrics');
  }
};
