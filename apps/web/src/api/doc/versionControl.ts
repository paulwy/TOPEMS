/**
 * Doc · 文档版本控制与审批 API 绑定
 *
 * 后端: doc 服务 /documents/{id}/versions/*
 * 路由:
 *   GET    /documents/{id}/versions
 *   POST   /documents/{id}/versions
 *   GET    /documents/{id}/versions/{version}
 *   PUT    /documents/{id}/versions/{version}
 *   DELETE /documents/{id}/versions/{version}
 *   POST   /documents/{id}/versions/{version}/restore
 *   POST   /documents/{id}/versions/{version}/publish
 *   POST   /documents/{id}/versions/{version}/unpublish
 *   GET    /documents/{id}/diff/{v1}/{v2}
 *   POST   /documents/{id}/lock
 *   DELETE /documents/{id}/lock
 *   GET    /documents/{id}/lock
 *   GET    /documents/my-checkouts
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  content: string;
  content_hash?: string;
  content_size?: number;
  change_summary?: string;
  change_type: 'created' | 'edited' | 'formatted' | 'reorganized' | 'restored';
  status: DocumentStatus;
  is_current: boolean;
  is_published: boolean;
  published_at?: string;
  published_by?: string;
  created_by: string;
  created_by_name?: string;
  locked_by?: string;
  locked_at?: string;
  created_at: string;
}

export interface CreateVersionRequest {
  content: string;
  change_summary?: string;
  change_type?: 'created' | 'edited' | 'formatted' | 'reorganized';
  notify_collaborators?: boolean;
}

export interface UpdateVersionRequest {
  content?: string;
  change_summary?: string;
}

export interface DocumentDiff {
  version_a: number;
  version_b: number;
  additions: number;
  deletions: number;
  modifications: number;
  content_diff: string;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    section?: string;
    content: string;
  }>;
}

export interface DocumentLock {
  document_id: string;
  locked_by: string;
  locked_by_name: string;
  locked_at: string;
  expires_at: string;
  version: number;
}

export const docVersionApi = {
  // ==================== 版本列表 ====================

  listVersions: async (
    documentId: string,
    params?: {
      status?: DocumentStatus;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<DocumentVersion>>> => {
    return apiClient.doc.get(`/documents/${documentId}/versions`, { params });
  },

  getVersion: async (
    documentId: string,
    version: number
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.get(`/documents/${documentId}/versions/${version}`);
  },

  // ==================== 版本创建/更新 ====================

  createVersion: async (
    documentId: string,
    data: CreateVersionRequest
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.post(`/documents/${documentId}/versions`, data);
  },

  updateVersion: async (
    documentId: string,
    version: number,
    data: UpdateVersionRequest
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.put(`/documents/${documentId}/versions/${version}`, data);
  },

  deleteVersion: async (documentId: string, version: number): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/documents/${documentId}/versions/${version}`);
  },

  // ==================== 版本操作 ====================

  restoreVersion: async (
    documentId: string,
    version: number,
    data?: { summary?: string }
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.post(`/documents/${documentId}/versions/${version}/restore`, data || {});
  },

  publishVersion: async (
    documentId: string,
    version: number,
    data?: { message?: string }
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.post(`/documents/${documentId}/versions/${version}/publish`, data || {});
  },

  unpublishVersion: async (
    documentId: string,
    version: number
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.doc.post(`/documents/${documentId}/versions/${version}/unpublish`);
  },

  // ==================== 版本对比 ====================

  getDiff: async (
    documentId: string,
    versionA: number,
    versionB: number
  ): Promise<ApiResponse<DocumentDiff>> => {
    return apiClient.doc.get(`/documents/${documentId}/diff/${versionA}/${versionB}`);
  },

  // ==================== 锁定/检出 ====================

  acquireLock: async (
    documentId: string,
    data?: { duration_minutes?: number }
  ): Promise<ApiResponse<DocumentLock>> => {
    return apiClient.doc.post(`/documents/${documentId}/lock`, data || {});
  },

  releaseLock: async (documentId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/documents/${documentId}/lock`);
  },

  getLock: async (documentId: string): Promise<ApiResponse<DocumentLock | null>> => {
    return apiClient.doc.get(`/documents/${documentId}/lock`);
  },

  listMyCheckouts: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<DocumentVersion>>> => {
    return apiClient.doc.get('/documents/my-checkouts', { params });
  },
};

export default docVersionApi;
