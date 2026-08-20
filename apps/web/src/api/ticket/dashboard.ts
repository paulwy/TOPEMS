/**
 * Ticket · 统计与仪表盘 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   GET    /tickets/stats
 *   GET    /tickets/sla-stats
 *   GET    /tickets/dashboard/summary
 *   GET    /tickets/dashboard/trend
 *   GET    /tickets/dashboard/by-severity
 *   GET    /tickets/dashboard/by-type
 *   GET    /tickets/dashboard/by-source
 *   GET    /tickets/dashboard/sla-overview
 *   GET    /tickets/dashboard/assignee-load
 */

import apiClient from '../client';
import type { TicketStats, TicketSlaStats, TicketQuery, TicketListResponse } from './types';

export interface DashboardSummary {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved_today: number;
  closed_today: number;
  sla_breached: number;
  avg_resolution_hours: number;
  avg_response_hours: number;
  new_this_week: number;
  resolved_this_week: number;
}

export interface TrendPoint {
  date: string;
  new: number;
  resolved: number;
  closed: number;
  breached: number;
}

interface AssigneeLoad {
  assignee_id: string;
  assignee_name: string;
  open_count: number;
  in_progress_count: number;
  overdue_count: number;
  total_load: number;
}

export const dashboardApi = {
  getStats: async () => {
    return apiClient.portal.get<{ data: TicketStats }>('/tickets/stats');
  },

  getSlaStats: async () => {
    return apiClient.portal.get<{ data: TicketSlaStats }>('/tickets/sla-stats');
  },

  getSummary: async () => {
    return apiClient.portal.get<{ data: DashboardSummary }>('/tickets/dashboard/summary');
  },

  getTrend: async (params?: { days?: number; from?: string; to?: string }) => {
    return apiClient.portal.get<{ data: TrendPoint[] }>('/tickets/dashboard/trend', {
      params,
    });
  },

  getBySeverity: async () => {
    return apiClient.portal.get<{
      data: Array<{ severity: string; count: number; breached: number }>;
    }>('/tickets/dashboard/by-severity');
  },

  getByType: async () => {
    return apiClient.portal.get<{
      data: Array<{ ticket_type: string; count: number; open: number; resolved: number }>;
    }>('/tickets/dashboard/by-type');
  },

  getBySource: async () => {
    return apiClient.portal.get<{ data: Array<{ source_service: string; count: number }> }>(
      '/tickets/dashboard/by-source'
    );
  },

  getSlaOverview: async () => {
    return apiClient.portal.get<{
      data: {
        total: number;
        on_time: number;
        breached: number;
        breach_rate: number;
        avg_resolution_minutes: number;
        avg_response_minutes: number;
      };
    }>('/tickets/dashboard/sla-overview');
  },

  getAssigneeLoad: async () => {
    return apiClient.portal.get<{ data: AssigneeLoad[] }>('/tickets/dashboard/assignee-load');
  },

  getMyDashboard: async () => {
    return apiClient.portal.get<{
      data: {
        my_open: number;
        my_in_progress: number;
        my_overdue: number;
        my_recent: TicketListResponse;
      };
    }>('/tickets/dashboard/my');
  },

  searchTickets: async (query: string, params?: TicketQuery) => {
    return apiClient.portal.get<{ data: TicketListResponse }>('/tickets/search', {
      params: { q: query, ...params },
    });
  },

  exportTickets: async (params?: TicketQuery & { format?: 'csv' | 'xlsx' }) => {
    return apiClient.portal.post<{ data: { url: string } }>('/tickets/export', { params });
  },
};

export default dashboardApi;
