/**
 * Template · 模板分配与使用统计 API 绑定
 *
 * 后端: doc 服务 /templates/{id}/assignments/*
 * 路由:
 *   GET    /templates/{id}/assignments
 *   POST   /templates/{id}/assignments
 *   DELETE /templates/{id}/assignments/{id}
 *   GET    /templates/{id}/usage
 *   GET    /templates/usage/stats
 *   GET    /templates/usage/top
 *   POST   /templates/{id}/clone
 *   POST   /templates/{id}/export
 *   POST   /templates/{id}/import
 *   GET    /templates/{id}/dependencies
 *   POST   /templates/{id}/dependencies
 *   DELETE /templates/{id}/dependencies/{dep_id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type AssignmentScope =
  'global' | 'organization' | 'department' | 'role' | 'user_group' | 'user';

export type AssignmentStatus = 'active' | 'inactive' | 'scheduled';

export interface TemplateAssignment {
  id: string;
  template_id: string;
  scope_type: AssignmentScope;
  scope_id: string;
  scope_name?: string;
  assigned_to: string;
  permission: 'use' | 'edit' | 'manage';
  is_default: boolean;
  status: AssignmentStatus;
  valid_from?: string;
  valid_until?: string;
  conditions?: Array<Record<string, unknown>>;
  assigned_by: string;
  assigned_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentRequest {
  scope_type: AssignmentScope;
  scope_id: string;
  assigned_to?: string;
  permission?: 'use' | 'edit' | 'manage';
  is_default?: boolean;
  valid_from?: string;
  valid_until?: string;
  conditions?: Array<Record<string, unknown>>;
}

export interface UsageStats {
  template_id: string;
  template_name: string;
  total_uses: number;
  uses_this_month: number;
  uses_this_week: number;
  uses_today: number;
  last_used_at?: string;
  most_used_by?: Array<{ user_id: string; user_name: string; count: number }>;
  usage_trend?: Array<{ date: string; count: number }>;
}

export interface TopTemplate {
  template_id: string;
  template_name: string;
  template_type: string;
  total_uses: number;
  uses_this_month: number;
  view_count: number;
  conversion_rate: number;
}

export interface TemplateDependency {
  id: string;
  template_id: string;
  dependency_type: 'sub_template' | 'shared_variable' | 'data_source';
  dependency_id: string;
  dependency_name: string;
  is_required: boolean;
  created_at: string;
}

export interface CloneTemplateRequest {
  name?: string;
  code?: string;
  target_type?: string;
  include_assignments?: boolean;
  include_dependencies?: boolean;
}

export const templateAssignmentApi = {
  // ==================== 分配管理 ====================

  listAssignments: async (
    templateId: string,
    params?: {
      scope_type?: AssignmentScope;
      status?: AssignmentStatus;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<TemplateAssignment>>> => {
    return apiClient.doc.get(`/templates/${templateId}/assignments`, { params });
  },

  createAssignment: async (
    templateId: string,
    data: CreateAssignmentRequest
  ): Promise<ApiResponse<TemplateAssignment>> => {
    return apiClient.doc.post(`/templates/${templateId}/assignments`, data);
  },

  deleteAssignment: async (
    templateId: string,
    assignmentId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/templates/${templateId}/assignments/${assignmentId}`);
  },

  // ==================== 使用统计 ====================

  getTemplateUsage: async (templateId: string): Promise<ApiResponse<UsageStats>> => {
    return apiClient.doc.get(`/templates/${templateId}/usage`);
  },

  getUsageStats: async (params?: {
    template_type?: string;
    period?: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<
    ApiResponse<{
      total_templates: number;
      total_uses: number;
      avg_uses_per_template: number;
      active_users: number;
    }>
  > => {
    return apiClient.doc.get('/templates/usage/stats', { params });
  },

  getTopTemplates: async (params?: {
    period?: 'week' | 'month' | 'quarter';
    limit?: number;
    template_type?: string;
  }): Promise<ApiResponse<TopTemplate[]>> => {
    return apiClient.doc.get('/templates/usage/top', { params });
  },

  // ==================== 模板操作 ====================

  cloneTemplate: async (
    templateId: string,
    data?: CloneTemplateRequest
  ): Promise<ApiResponse<{ id: string; name: string }>> => {
    return apiClient.doc.post(`/templates/${templateId}/clone`, data || {});
  },

  exportTemplate: async (
    templateId: string,
    data?: { format?: 'json' | 'xml' }
  ): Promise<ApiResponse<{ download_url: string; format: string }>> => {
    return apiClient.doc.post(`/templates/${templateId}/export`, data || {});
  },

  importTemplate: async (data: {
    file: File;
    category_id?: string;
  }): Promise<ApiResponse<{ id: string; name: string }>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.category_id) formData.append('category_id', data.category_id);
    return apiClient.doc.post('/templates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ==================== 依赖管理 ====================

  listDependencies: async (templateId: string): Promise<ApiResponse<TemplateDependency[]>> => {
    return apiClient.doc.get(`/templates/${templateId}/dependencies`);
  },

  addDependency: async (
    templateId: string,
    data: Omit<TemplateDependency, 'id' | 'template_id' | 'created_at'>
  ): Promise<ApiResponse<TemplateDependency>> => {
    return apiClient.doc.post(`/templates/${templateId}/dependencies`, data);
  },

  removeDependency: async (templateId: string, depId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/templates/${templateId}/dependencies/${depId}`);
  },
};

export default templateAssignmentApi;
