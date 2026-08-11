/**
 * Mobile · 移动端质量检验/缺陷管理 API 绑定
 *
 * 后端: svc/mobile/src/main.rs
 * 路由:
 *   GET    /mobile/quality/tasks
 *   GET    /mobile/quality/tasks/{id}
 *   POST   /mobile/quality/tasks/{id}/start
 *   PUT    /mobile/quality/tasks/{id}/status
 *   GET    /mobile/quality/defects
 *   POST   /mobile/quality/defects
 *   GET    /mobile/quality/defects/{id}
 *   PUT    /mobile/quality/defects/{id}/status
 *   GET    /mobile/quality/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type QualityTaskType = 'incoming' | 'process' | 'finished' | 'outgoing';
export type QualityTaskStatus = 'pending' | 'in_progress' | 'passed' | 'failed';
export type DefectSeverity = 'minor' | 'major' | 'critical';
export type DefectStatus = 'open' | 'processing' | 'closed';

export interface QualityTask {
  id: string;
  task_no: string;
  type: QualityTaskType;
  product_name: string;
  batch_no: string;
  quantity: number;
  status: QualityTaskStatus;
  inspector: string;
  due_date: string;
  created_at: string;
}

export interface DefectRecord {
  id: string;
  task_id: string;
  product_name: string;
  batch_no: string;
  defect_type: string;
  severity: DefectSeverity;
  quantity: number;
  description: string;
  images?: string[];
  reporter: string;
  reported_at: string;
  status: DefectStatus;
}

export interface QualityStats {
  today_inspections: number;
  today_pass_rate: number;
  today_defects: number;
  pending_tasks: number;
  by_type: Array<{
    type: QualityTaskType;
    count: number;
    pass_rate: number;
  }>;
  by_severity: Array<{
    severity: DefectSeverity;
    count: number;
  }>;
}

export interface CreateDefectRequest {
  task_id: string;
  defect_type: string;
  severity: DefectSeverity;
  quantity: number;
  description: string;
  images?: string[];
}

export interface UpdateTaskStatusRequest {
  status: QualityTaskStatus;
  result?: { passed: boolean; remark?: string };
  inspected_quantity?: number;
}

export const qualityApi = {
  // ==================== 质检任务 ====================

  listTasks: async (params?: {
    type?: QualityTaskType;
    status?: QualityTaskStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<QualityTask>>> => {
    return apiClient.mobile.get('/mobile/quality/tasks', { params });
  },

  getTask: async (id: string): Promise<ApiResponse<QualityTask>> => {
    return apiClient.mobile.get(`/mobile/quality/tasks/${id}`);
  },

  startTask: async (id: string): Promise<ApiResponse<QualityTask>> => {
    return apiClient.mobile.post(`/mobile/quality/tasks/${id}/start`);
  },

  updateTaskStatus: async (
    id: string,
    data: UpdateTaskStatusRequest
  ): Promise<ApiResponse<QualityTask>> => {
    return apiClient.mobile.put(`/mobile/quality/tasks/${id}/status`, data);
  },

  // ==================== 缺陷记录 ====================

  listDefects: async (params?: {
    status?: DefectStatus;
    severity?: DefectSeverity;
    task_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<DefectRecord>>> => {
    return apiClient.mobile.get('/mobile/quality/defects', { params });
  },

  getDefect: async (id: string): Promise<ApiResponse<DefectRecord>> => {
    return apiClient.mobile.get(`/mobile/quality/defects/${id}`);
  },

  reportDefect: async (data: CreateDefectRequest): Promise<ApiResponse<DefectRecord>> => {
    return apiClient.mobile.post('/mobile/quality/defects', data);
  },

  updateDefectStatus: async (
    id: string,
    status: DefectStatus,
    remark?: string
  ): Promise<ApiResponse<DefectRecord>> => {
    return apiClient.mobile.put(`/mobile/quality/defects/${id}/status`, {
      status,
      remark,
    });
  },

  // ==================== 质量统计 ====================

  getQualityStats: async (params?: {
    period?: 'today' | 'week' | 'month';
  }): Promise<ApiResponse<QualityStats>> => {
    return apiClient.mobile.get('/mobile/quality/stats', { params });
  },
};

export default qualityApi;
