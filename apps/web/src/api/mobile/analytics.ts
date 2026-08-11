/**
 * Mobile · 移动数据分析 (Analytics) API 绑定
 *
 * 路由:
 *   GET    /mobile/analytics/usage
 *   GET    /mobile/analytics/screen-time
 *   GET    /mobile/analytics/feature-usage
 *   GET    /mobile/analytics/performance
 *   GET    /mobile/analytics/daily-summary
 *   GET    /mobile/analytics/engagement
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type Platform = 'ios' | 'android' | 'web';

export interface MobileUsageStats {
  total_sessions: number;
  total_duration_minutes: number;
  avg_session_duration_minutes: number;
  avg_daily_usage_minutes: number;
  last_active_at?: string;
  sessions_by_day: Array<{
    date: string;
    sessions: number;
    duration_minutes: number;
  }>;
  sessions_by_hour: Array<{
    hour: number;
    count: number;
  }>;
}

export interface ScreenTimeData {
  total_screen_time_minutes: number;
  by_screen: Array<{
    screen_name: string;
    screen_code: string;
    duration_minutes: number;
    views: number;
    avg_time_per_view_seconds: number;
  }>;
  by_feature: Array<{
    feature_name: string;
    duration_minutes: number;
  }>;
  top_screens: Array<{
    rank: number;
    screen_name: string;
    duration_minutes: number;
  }>;
}

export interface FeatureUsage {
  feature_code: string;
  feature_name: string;
  category: string;
  usage_count: number;
  unique_users: number;
  last_used_at?: string;
  avg_duration_seconds: number;
  is_favorite: boolean;
}

export interface MobilePerformance {
  load_time_ms: number;
  api_response_time_ms: number;
  error_rate: number;
  crash_rate: number;
  memory_usage_mb: number;
  storage_usage_mb: number;
  network_requests: number;
  by_endpoint: Array<{
    endpoint: string;
    avg_response_time_ms: number;
    error_count: number;
    request_count: number;
  }>;
}

export interface DailySummary {
  date: string;
  sessions: number;
  duration_minutes: number;
  screens_viewed: number;
  features_used: number;
  tasks_completed: number;
  approvals_processed: number;
  inspections_done: number;
  scans: number;
  photos_uploaded: number;
}

export interface EngagementMetrics {
  daily_active_users: number;
  monthly_active_users: number;
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
  avg_session_per_user: number;
  avg_pages_per_session: number;
  bounce_rate: number;
  by_platform: Array<{
    platform: Platform;
    users: number;
    avg_usage_minutes: number;
  }>;
}

export const analyticsApi = {
  getUsageStats: async (params?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<MobileUsageStats>> => {
    return apiClient.mobile.get('/mobile/analytics/usage', { params });
  },

  getScreenTime: async (params?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<ScreenTimeData>> => {
    return apiClient.mobile.get('/mobile/analytics/screen-time', { params });
  },

  getFeatureUsage: async (params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<FeatureUsage[]>> => {
    return apiClient.mobile.get('/mobile/analytics/feature-usage', { params });
  },

  getPerformance: async (): Promise<ApiResponse<MobilePerformance>> => {
    return apiClient.mobile.get('/mobile/analytics/performance');
  },

  getDailySummary: async (date?: string): Promise<ApiResponse<DailySummary>> => {
    return apiClient.mobile.get('/mobile/analytics/daily-summary', {
      params: { date },
    });
  },

  getEngagement: async (params?: {
    period?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<EngagementMetrics>> => {
    return apiClient.mobile.get('/mobile/analytics/engagement', { params });
  },
};

export default analyticsApi;
