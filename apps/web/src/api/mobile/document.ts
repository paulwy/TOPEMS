/**
 * Mobile · 移动端 PDM 文档管理 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 PDM 服务客户端)
 * 路由:
 *   GET    /mobile/documents
 *   GET    /mobile/documents/{id}
 *   POST   /mobile/documents
 *   PUT    /mobile/documents/{id}
 *   DELETE /mobile/documents/{id}
 *   GET    /mobile/documents/{id}/versions
 *   POST   /mobile/documents/{id}/versions
 *   GET    /mobile/documents/{id}/approvals
 *   POST   /mobile/documents/{id}/approvals
 *   PUT    /mobile/documents/{id}/approvals/{approvalId}
 *   GET    /mobile/document-categories
 *   GET    /mobile/documents/stats
 *   GET    /mobile/my-documents/recent
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DocumentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type DocumentType = 'specification' | 'drawing' | 'report' | 'manual' | 'contract' | 'other';

export interface Document {
  id: string;
  title: string;
  code?: string;
  type: DocumentType;
  category?: string;
  status: DocumentStatus;
  version: string;
  current_version_id?: string;
  owner: string;
  owner_name?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  file_url?: string;
  file_size?: number;
  change_summary?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface DocumentApproval {
  id: string;
  document_id: string;
  document_title: string;
  approver: string;
  approver_name?: string;
  status: ApprovalStatus;
  approved_at?: string;
  comments?: string;
  order: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  document_count: number;
}

export interface DocumentStats {
  total_documents: number;
  by_status: Array<{
    status: DocumentStatus;
    count: number;
  }>;
  by_type: Array<{
    type: DocumentType;
    count: number;
  }>;
  recent_updated: Array<{
    title: string;
    updated_at: string;
  }>;
  pending_approvals: number;
}

export interface CreateDocumentRequest {
  title: string;
  type: DocumentType;
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
}

export interface CreateVersionRequest {
  change_summary?: string;
  file_url?: string;
  file_size?: number;
}

export interface CreateApprovalRequest {
  approver_id: string;
  order?: number;
}

export const documentApi = {
  // ==================== 文档管理 ====================

  listDocuments: async (params?: {
    keyword?: string;
    type?: DocumentType;
    category?: string;
    status?: DocumentStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiClient.mobile.get('documents', { params });
  },

  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.mobile.get(`documents/${id}`);
  },

  createDocument: async (data: CreateDocumentRequest): Promise<ApiResponse<Document>> => {
    return apiClient.mobile.post('documents', data);
  },

  updateDocument: async (
    id: string,
    data: Partial<CreateDocumentRequest>
  ): Promise<ApiResponse<Document>> => {
    return apiClient.mobile.put(`documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`documents/${id}`);
  },

  // ==================== 版本管理 ====================

  listVersions: async (documentId: string): Promise<ApiResponse<DocumentVersion[]>> => {
    return apiClient.mobile.get(`documents/${documentId}/versions`);
  },

  createVersion: async (
    documentId: string,
    data: CreateVersionRequest
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.mobile.post(`documents/${documentId}/versions`, data);
  },

  // ==================== 审批管理 ====================

  listApprovals: async (documentId: string): Promise<ApiResponse<DocumentApproval[]>> => {
    return apiClient.mobile.get(`documents/${documentId}/approvals`);
  },

  createApproval: async (
    documentId: string,
    data: CreateApprovalRequest
  ): Promise<ApiResponse<DocumentApproval>> => {
    return apiClient.mobile.post(`documents/${documentId}/approvals`, data);
  },

  updateApproval: async (
    documentId: string,
    approvalId: string,
    data: { status: ApprovalStatus; comments?: string }
  ): Promise<ApiResponse<DocumentApproval>> => {
    return apiClient.mobile.put(`documents/${documentId}/approvals/${approvalId}`, data);
  },

  // ==================== 分类管理 ====================

  listCategories: async (params?: {
    parent_id?: string;
  }): Promise<ApiResponse<DocumentCategory[]>> => {
    return apiClient.mobile.get('document-categories', { params });
  },

  // ==================== 统计与最近文档 ====================

  getDocumentStats: async (): Promise<ApiResponse<DocumentStats>> => {
    return apiClient.mobile.get('documents/stats');
  },

  listRecentDocuments: async (params?: { limit?: number }): Promise<ApiResponse<Document[]>> => {
    return apiClient.mobile.get('my-documents/recent', { params });
  },
};

export default documentApi;
