/**
 * Doc · 文档协作 API 绑定
 *
 * 后端: doc 服务 /documents/{id}/collaboration/*
 * 路由:
 *   GET    /documents/{id}/collaborators
 *   POST   /documents/{id}/collaborators
 *   DELETE /documents/{id}/collaborators/{user_id}
 *   GET    /documents/{id}/comments
 *   POST   /documents/{id}/comments
 *   DELETE /documents/{id}/comments/{id}
 *   PUT    /documents/{id}/comments/{id}
 *   GET    /documents/{id}/activities
 *   GET    /documents/{id}/versions (for collaboration history)
 *   POST   /documents/{id}/share
 *   DELETE /documents/{id}/share/{share_id}
 *   GET    /documents/shared-with-me
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type CollaboratorPermission = 'view' | 'comment' | 'edit' | 'manage';

export interface Collaborator {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  permission: CollaboratorPermission;
  is_active: boolean;
  joined_at?: string;
  last_activity?: string;
}

export interface AddCollaboratorRequest {
  user_ids: string[];
  permission: CollaboratorPermission;
  send_notification?: boolean;
  message?: string;
}

export interface UpdateCollaboratorRequest {
  permission: CollaboratorPermission;
}

export interface Comment {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  resolved: boolean;
  mentions?: string[];
  quoted_comment_id?: string;
  position?: { page?: number; anchor?: string };
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  mentions?: string[];
  quoted_comment_id?: string;
  position?: { page?: number; anchor?: string };
}

export interface ActivityRecord {
  id: string;
  document_id: string;
  action: 'view' | 'edit' | 'comment' | 'share' | 'download' | 'delete' | 'restore';
  user_id: string;
  user_name: string;
  user_avatar?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface ShareLink {
  id: string;
  document_id: string;
  share_url: string;
  share_type: 'anyone' | 'organization' | 'specific';
  permission: 'view' | 'comment' | 'edit';
  require_password: boolean;
  password?: string;
  expires_at?: string;
  view_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface CreateShareLinkRequest {
  share_type: 'anyone' | 'organization' | 'specific';
  permission: 'view' | 'comment' | 'edit';
  require_password?: boolean;
  expires_at?: string;
}

export const docCollaborationApi = {
  // ==================== 协作者管理 ====================

  listCollaborators: async (documentId: string): Promise<ApiResponse<Collaborator[]>> => {
    return apiClient.doc.get(`/documents/${documentId}/collaborators`);
  },

  addCollaborators: async (
    documentId: string,
    data: AddCollaboratorRequest
  ): Promise<ApiResponse<Collaborator[]>> => {
    return apiClient.doc.post(`/documents/${documentId}/collaborators`, data);
  },

  updateCollaborator: async (
    documentId: string,
    userId: string,
    data: UpdateCollaboratorRequest
  ): Promise<ApiResponse<Collaborator>> => {
    return apiClient.doc.put(`/documents/${documentId}/collaborators/${userId}`, data);
  },

  removeCollaborator: async (documentId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/documents/${documentId}/collaborators/${userId}`);
  },

  // ==================== 评论 ====================

  listComments: async (
    documentId: string,
    params?: { resolved?: boolean; page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    return apiClient.doc.get(`/documents/${documentId}/comments`, { params });
  },

  createComment: async (
    documentId: string,
    data: CreateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    return apiClient.doc.post(`/documents/${documentId}/comments`, data);
  },

  updateComment: async (
    documentId: string,
    commentId: string,
    data: { content?: string; resolved?: boolean }
  ): Promise<ApiResponse<Comment>> => {
    return apiClient.doc.put(`/documents/${documentId}/comments/${commentId}`, data);
  },

  deleteComment: async (documentId: string, commentId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/documents/${documentId}/comments/${commentId}`);
  },

  // ==================== 活动记录 ====================

  listActivities: async (
    documentId: string,
    params?: {
      action?: ActivityRecord['action'];
      user_id?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ActivityRecord>>> => {
    return apiClient.doc.get(`/documents/${documentId}/activities`, { params });
  },

  // ==================== 分享链接 ====================

  createShareLink: async (
    documentId: string,
    data: CreateShareLinkRequest
  ): Promise<ApiResponse<ShareLink>> => {
    return apiClient.doc.post(`/documents/${documentId}/share`, data);
  },

  listShareLinks: async (documentId: string): Promise<ApiResponse<ShareLink[]>> => {
    return apiClient.doc.get(`/documents/${documentId}/share`);
  },

  deleteShareLink: async (documentId: string, shareId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/documents/${documentId}/share/${shareId}`);
  },

  listMyShared: async (params?: {
    page?: number;
    page_size?: number;
    shared_by?: string;
  }): Promise<ApiResponse<PaginatedResponse<ShareLink>>> => {
    return apiClient.doc.get('/documents/shared-with-me', { params });
  },
};

export default docCollaborationApi;
