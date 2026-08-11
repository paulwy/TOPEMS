/**
 * Feedback · 统计与看板 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedback/dashboard/summary
 *   GET    /feedback/dashboard/trend
 *   GET    /feedback/dashboard/by-type
 *   GET    /feedback/dashboard/by-status
 *   GET    /feedback/dashboard/by-assignee
 *   GET    /feedback/dashboard/sla
 *   GET    /feedback/dashboard/satisfaction
 *   GET    /feedback/dashboard/categories
 *   GET    /feedback/dashboard/resolution-time-trend
 *   GET    /feedback/dashboard/by-source
 *   GET    /feedback/dashboard/top-issues
 *   GET    /feedback/dashboard/response-time-stats
 *   GET    /feedback/dashboard/assignee-workload
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface DashboardSummary {
  total: number;
  open: number;
  processing: number;
  resolved: number;
  closed: number;
  resolved_today: number;
  created_today: number;
  avg_resolution_days: number;
  avg_response_hours: number;
  satisfaction_score: number;
  sla_compliance_rate: number;
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
  closed: number;
}

export interface ByTypeStat {
  type: string;
  label: string;
  total: number;
  open: number;
  resolved: number;
  avg_resolution_days?: number;
}

export interface ByStatusStat {
  status: string;
  label: string;
  total: number;
  percentage: number;
}

export interface ByAssigneeStat {
  assignee_id: string;
  assignee_name: string;
  avatar_url?: string;
  total: number;
  open: number;
  resolved: number;
  avg_resolution_days?: number;
  satisfaction_score?: number;
}

export interface SlaDashboard {
  total: number;
  on_time: number;
  breached: number;
  pending_deadline: number;
  breach_rate: number;
  by_type: Array<{
    type: string;
    total: number;
    on_time: number;
    breached: number;
  }>;
}

export interface SatisfactionStat {
  average_score: number;
  total_rated: number;
  distribution: Array<{ score: number; count: number }>;
  trend: Array<{ date: string; avg_score: number; count: number }>;
}

export interface CategoryStat {
  category_id: string;
  category_name: string;
  total: number;
  open: number;
  resolved: number;
  avg_resolution_days?: number;
}

export interface ResolutionTimeTrendPoint {
  date: string;
  avg_resolution_hours: number;
  p50_resolution_hours: number;
  p95_resolution_hours: number;
  resolved_count: number;
}

export interface BySourceStat {
  source: string;
  label: string;
  total: number;
  open: number;
  resolved: number;
  avg_resolution_days?: number;
}

export interface TopIssue {
  id: string;
  title: string;
  type: string;
  category_name?: string;
  total_count: number;
  open_count: number;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface ResponseTimeStats {
  avg_response_hours: number;
  p50_response_hours: number;
  p95_response_hours: number;
  within_sla_percentage: number;
  by_type: Array<{
    type: string;
    avg_response_hours: number;
    within_sla_percentage: number;
  }>;
}

export interface AssigneeWorkload {
  assignee_id: string;
  assignee_name: string;
  avatar_url?: string;
  current_load: number;
  capacity_limit: number;
  load_percentage: number;
  overdue_count: number;
  avg_resolution_days?: number;
  satisfaction_score?: number;
}

export const dashboardApi = {
  getSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
    return apiClient.feedback.get('/feedback/dashboard/summary');
  },

  getTrend: async (params?: { days?: number }): Promise<ApiResponse<TrendPoint[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/trend', { params });
  },

  getByType: async (): Promise<ApiResponse<ByTypeStat[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/by-type');
  },

  getByStatus: async (): Promise<ApiResponse<ByStatusStat[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/by-status');
  },

  getByAssignee: async (): Promise<ApiResponse<ByAssigneeStat[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/by-assignee');
  },

  getSlaDashboard: async (): Promise<ApiResponse<SlaDashboard>> => {
    return apiClient.feedback.get('/feedback/dashboard/sla');
  },

  getSatisfaction: async (): Promise<ApiResponse<SatisfactionStat>> => {
    return apiClient.feedback.get('/feedback/dashboard/satisfaction');
  },

  getCategoryStats: async (): Promise<ApiResponse<CategoryStat[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/categories');
  },

  getResolutionTimeTrend: async (params?: {
    period: 'week' | 'month' | 'quarter';
  }): Promise<ApiResponse<ResolutionTimeTrendPoint[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/resolution-time-trend', {
      params,
    });
  },

  getFeedbackSourceStats: async (): Promise<ApiResponse<BySourceStat[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/by-source');
  },

  getTopIssues: async (params?: { limit?: number }): Promise<ApiResponse<TopIssue[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/top-issues', { params });
  },

  getResponseTimeStats: async (): Promise<ApiResponse<ResponseTimeStats>> => {
    return apiClient.feedback.get('/feedback/dashboard/response-time-stats');
  },

  getAssigneeWorkload: async (): Promise<ApiResponse<AssigneeWorkload[]>> => {
    return apiClient.feedback.get('/feedback/dashboard/assignee-workload');
  },
};

export default dashboardApi;
