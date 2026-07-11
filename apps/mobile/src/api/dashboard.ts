import { apiClient } from './client';
import type { ApiResponse, DashboardStats, QuickAction } from '@/types';

export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  getQuickActions: async (): Promise<ApiResponse<QuickAction[]>> => {
    const response = await apiClient.get('/dashboard/quick-actions');
    return response.data;
  },

  getRecentActivities: async (params: {
    limit?: number;
  }): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    time: string;
    icon?: string;
    url?: string;
  }>>> => {
    const response = await apiClient.get('/dashboard/activities', { params });
    return response.data;
  },

  getKPIs: async (params: {
    period?: 'today' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<Record<string, {
    value: number;
    previousValue: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
    label: string;
    unit?: string;
  }>>> => {
    const response = await apiClient.get('/dashboard/kpis', { params });
    return response.data;
  },

  getCharts: async (params: {
    chartType: 'tasks' | 'attendance' | 'inventory' | 'production';
    period?: string;
  }): Promise<ApiResponse<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  }>> => {
    const response = await apiClient.get('/dashboard/charts', { params });
    return response.data;
  },

  getAlerts: async (): Promise<ApiResponse<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    url?: string;
  }>>> => {
    const response = await apiClient.get('/dashboard/alerts');
    return response.data;
  },

  acknowledgeAlert: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/dashboard/alerts/${id}/acknowledge`);
    return response.data;
  },

  getAnnouncements: async (): Promise<ApiResponse<Array<{
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'important';
    publishedAt: string;
    expiresAt?: string;
    read: boolean;
  }>>> => {
    const response = await apiClient.get('/dashboard/announcements');
    return response.data;
  },

  markAnnouncementRead: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/dashboard/announcements/${id}/read`);
    return response.data;
  },
};