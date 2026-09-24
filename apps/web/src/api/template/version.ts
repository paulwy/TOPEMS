/**
 * Template · 模板版本管理 API 绑定
 *
 * 后端: doc 服务 /templates/{id}/versions/*
 * 路由:
 *   GET    /templates/{id}/versions
 *   POST   /templates/{id}/versions
 *   GET    /templates/{id}/versions/{version}
 *   PUT    /templates/{id}/versions/{version}
 *   DELETE /templates/{id}/versions/{version}
 *   POST   /templates/{id}/versions/{version}/activate
 *   POST   /templates/{id}/versions/{version}/rollback
 *   GET    /templates/{id}/versions/{version}/diff
 *   POST   /templates/{id}/versions/compare
 *   GET    /templates/{id}/versions/history
 *   GET    /templates/{id}/versions/changelog
 *   POST   /templates/{id}/versions/{version}/fork
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  label?: string;
  content: string;
  variables: Array<Record<string, unknown>>;
  change_summary?: string;
  change_type: 'create' | 'update' | 'fork' | 'rollback' | 'ai_generate';
  is_active: boolean;
  is_draft: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface CreateVersionRequest {
  content: string;
  variables?: Array<Record<string, unknown>>;
  label?: string;
  change_summary?: string;
  change_type?: 'create' | 'update' | 'fork' | 'ai_generate';
  is_draft?: boolean;
}

export interface UpdateVersionRequest {
  content?: string;
  variables?: Array<Record<string, unknown>>;
  label?: string;
  change_summary?: string;
}

export interface VersionDiff {
  version_a: number;
  version_b: number;
  additions: number;
  deletions: number;
  changes: Array<{
    field: string;
    type: 'added' | 'removed' | 'modified';
    old_value?: unknown;
    new_value?: unknown;
  }>;
}

export interface VersionCompareRequest {
  version_a: number;
  version_b: number;
  compare_type?: 'content' | 'variables' | 'full';
}

export interface VersionHistoryEntry {
  id: string;
  version: number;
  action: 'created' | 'updated' | 'activated' | 'rollback' | 'forked' | 'deleted';
  actor_id: string;
  actor_name: string;
  summary?: string;
  created_at: string;
}

export const templateVersionApi = {
  // ==================== 版本列表 ====================

  listVersions: async (
    templateId: string,
    params?: {
      include_drafts?: boolean;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<TemplateVersion>>> => {
    return apiClient.doc.get(`/templates/${templateId}/versions`, { params });
  },

  getVersion: async (
    templateId: string,
    version: number
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.get(`/templates/${templateId}/versions/${version}`);
  },

  // ==================== 版本创建/更新 ====================

  createVersion: async (
    templateId: string,
    data: CreateVersionRequest
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.post(`/templates/${templateId}/versions`, data);
  },

  updateVersion: async (
    templateId: string,
    version: number,
    data: UpdateVersionRequest
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.put(`/templates/${templateId}/versions/${version}`, data);
  },

  deleteVersion: async (templateId: string, version: number): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/templates/${templateId}/versions/${version}`);
  },

  // ==================== 版本操作 ====================

  activateVersion: async (
    templateId: string,
    version: number
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.post(`/templates/${templateId}/versions/${version}/activate`);
  },

  rollbackVersion: async (
    templateId: string,
    version: number
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.post(`/templates/${templateId}/versions/${version}/rollback`);
  },

  forkVersion: async (
    templateId: string,
    version: number,
    data?: { label?: string; summary?: string }
  ): Promise<ApiResponse<TemplateVersion>> => {
    return apiClient.doc.post(`/templates/${templateId}/versions/${version}/fork`, data || {});
  },

  // ==================== 版本对比 ====================

  getVersionDiff: async (
    templateId: string,
    version: number,
    compareTo: number
  ): Promise<ApiResponse<VersionDiff>> => {
    return apiClient.doc.get(`/templates/${templateId}/versions/${version}/diff`, {
      params: { compare_to: compareTo },
    });
  },

  compareVersions: async (
    templateId: string,
    data: VersionCompareRequest
  ): Promise<ApiResponse<VersionDiff>> => {
    return apiClient.doc.post(`/templates/${templateId}/versions/compare`, data);
  },

  // ==================== 版本历史 ====================

  getVersionHistory: async (
    templateId: string,
    params?: { page?: number; page_size?: number; action?: string }
  ): Promise<ApiResponse<PaginatedResponse<VersionHistoryEntry>>> => {
    return apiClient.doc.get(`/templates/${templateId}/versions/history`, { params });
  },

  getChangelog: async (
    templateId: string,
    params?: { since_version?: number; limit?: number }
  ): Promise<ApiResponse<Array<{ version: number; summary: string; changes: string[] }>>> => {
    return apiClient.doc.get(`/templates/${templateId}/versions/changelog`, { params });
  },
};

export default templateVersionApi;
