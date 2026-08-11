/**
 * WMS · 劳动力与效率分析 (Labor) API 绑定
 *
 * 后端: svc/wms/src/modules/labor.rs
 * 路由:
 *   GET    /labor/efficiency
 *   GET    /labor/efficiency/{user_id}
 *   GET    /labor/productivity
 *   GET    /labor/workload
 *   GET    /labor/performance-dashboard
 *   POST   /labor/shifts
 *   GET    /labor/shifts
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface LaborEfficiency {
  user_id: string;
  user_name: string;
  date: string;
  shift: string;
  tasks_completed: number;
  tasks_assigned: number;
  efficiency_rate: number;
  avg_task_duration: number;
  picking_rate: number;
  putaway_rate: number;
  errors: number;
  hours_worked: number;
}

export interface ProductivityMetric {
  date: string;
  warehouse_id: string;
  total_tasks: number;
  completed_tasks: number;
  avg_completion_time: number;
  tasks_per_hour: number;
  backlog_count: number;
}

export interface Workload {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  current_tasks: number;
  pending_tasks: number;
  completed_today: number;
  capacity_percent: number;
  workload_score: number;
}

export interface PerformanceDashboard {
  period: string;
  total_users: number;
  total_tasks: number;
  completed_tasks: number;
  avg_efficiency_rate: number;
  avg_tasks_per_hour: number;
  total_hours_worked: number;
  top_performers: Array<{
    user_id: string;
    user_name: string;
    efficiency_rate: number;
    tasks_completed: number;
  }>;
  warehouse_comparison: Array<{
    warehouse_id: string;
    warehouse_name: string;
    avg_efficiency: number;
    total_tasks: number;
  }>;
}

export interface Shift {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  warehouse_id: string;
  zone?: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'absent';
  tasks_assigned: number;
  tasks_completed: number;
  created_at: string;
}

export const laborApi = {
  listEfficiency: async (params?: {
    date_from?: string;
    date_to?: string;
    warehouse_id?: string;
  }): Promise<ApiResponse<LaborEfficiency[]>> => {
    return apiClient.wms.get('/labor/efficiency', { params });
  },

  getUserEfficiency: async (
    userId: string,
    params?: {
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ApiResponse<LaborEfficiency[]>> => {
    return apiClient.wms.get(`/labor/efficiency/${userId}`, { params });
  },

  getProductivity: async (params?: {
    warehouse_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<ProductivityMetric[]>> => {
    return apiClient.wms.get('/labor/productivity', { params });
  },

  getWorkload: async (warehouseId?: string): Promise<ApiResponse<Workload[]>> => {
    return apiClient.wms.get('/labor/workload', { params: { warehouse_id: warehouseId } });
  },

  getPerformanceDashboard: async (params?: {
    period?: 'day' | 'week' | 'month';
    warehouse_id?: string;
  }): Promise<ApiResponse<PerformanceDashboard>> => {
    return apiClient.wms.get('/labor/performance-dashboard', { params });
  },

  listShifts: async (params?: {
    date?: string;
    warehouse_id?: string;
    status?: 'scheduled' | 'checked_in' | 'completed' | 'absent';
  }): Promise<ApiResponse<Shift[]>> => {
    return apiClient.wms.get('/labor/shifts', { params });
  },

  createShift: async (
    data: Omit<Shift, 'id' | 'created_at' | 'tasks_assigned' | 'tasks_completed'>
  ): Promise<ApiResponse<Shift>> => {
    return apiClient.wms.post('/labor/shifts', data);
  },
};

export default laborApi;
