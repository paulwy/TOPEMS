/**
 * Doc · 文档工作区与目录管理 API 绑定
 *
 * 后端: doc 服务
 * 路由:
 *   GET    /workspaces
 *   POST   /workspaces
 *   GET    /workspaces/{id}
 *   PUT    /workspaces/{id}
 *   DELETE /workspaces/{id}
 *   GET    /workspaces/{id}/tree
 *   POST   /workspaces/{id}/move
 *   POST   /workspaces/{id}/copy
 *   POST   /workspaces/{id}/empty-trash
 *   GET    /workspaces/{id}/trash
 *   DELETE /workspaces/{id}/trash/{item_id}
 *   POST   /workspaces/{id}/restore/{item_id}
 *   GET    /workspaces/{id}/search
 *   POST   /workspaces/{id}/sort
 *   GET    /workspaces/{id}/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface DocWorkspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type: 'personal' | 'team' | 'organization' | 'project';
  member_count: number;
  document_count: number;
  storage_used: number;
  storage_limit?: number;
  is_default: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'personal' | 'team' | 'organization' | 'project';
  member_ids?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  member_ids?: string[];
}

export interface DocTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'document';
  parent_id: string | null;
  children?: DocTreeNode[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface MoveItemsRequest {
  item_ids: string[];
  target_folder_id: string;
}

export interface CopyItemsRequest {
  item_ids: string[];
  target_folder_id: string;
  recursive?: boolean;
}

export interface TrashItem {
  id: string;
  name: string;
  item_type: 'folder' | 'document';
  deleted_by: string;
  deleted_by_name?: string;
  deleted_at: string;
  expires_at: string;
  original_path?: string;
  size?: number;
}

export interface WorkspaceStats {
  total_documents: number;
  total_folders: number;
  total_size: number;
  total_members: number;
  recently_modified: number;
  storage_percentage: number;
  by_type: Array<{ type: string; count: number; size: number }>;
}

export const docWorkspaceApi = {
  // ==================== 工作区管理 ====================

  listWorkspaces: async (params?: {
    type?: DocWorkspace['type'];
    include_personal?: boolean;
  }): Promise<ApiResponse<DocWorkspace[]>> => {
    return apiClient.doc.get('/workspaces', { params });
  },

  getWorkspace: async (id: string): Promise<ApiResponse<DocWorkspace>> => {
    return apiClient.doc.get(`/workspaces/${id}`);
  },

  createWorkspace: async (data: CreateWorkspaceRequest): Promise<ApiResponse<DocWorkspace>> => {
    return apiClient.doc.post('/workspaces', data);
  },

  updateWorkspace: async (
    id: string,
    data: UpdateWorkspaceRequest
  ): Promise<ApiResponse<DocWorkspace>> => {
    return apiClient.doc.put(`/workspaces/${id}`, data);
  },

  deleteWorkspace: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/workspaces/${id}`);
  },

  // ==================== 目录树 ====================

  getWorkspaceTree: async (
    workspaceId: string,
    params?: { depth?: number; include_trashed?: boolean }
  ): Promise<ApiResponse<DocTreeNode[]>> => {
    return apiClient.doc.get(`/workspaces/${workspaceId}/tree`, { params });
  },

  // ==================== 项目操作 ====================

  moveItems: async (
    workspaceId: string,
    data: MoveItemsRequest
  ): Promise<ApiResponse<{ moved: number }>> => {
    return apiClient.doc.post(`/workspaces/${workspaceId}/move`, data);
  },

  copyItems: async (
    workspaceId: string,
    data: CopyItemsRequest
  ): Promise<ApiResponse<{ copied: number }>> => {
    return apiClient.doc.post(`/workspaces/${workspaceId}/copy`, data);
  },

  sortItems: async (
    workspaceId: string,
    data: { sort_by: 'name' | 'date' | 'size' | 'type'; order: 'asc' | 'desc' }
  ): Promise<ApiResponse<string>> => {
    return apiClient.doc.post(`/workspaces/${workspaceId}/sort`, data);
  },

  // ==================== 回收站 ====================

  listTrash: async (
    workspaceId: string,
    params?: { page?: number; page_size?: number; type?: string }
  ): Promise<ApiResponse<PaginatedResponse<TrashItem>>> => {
    return apiClient.doc.get(`/workspaces/${workspaceId}/trash`, { params });
  },

  restoreFromTrash: async (
    workspaceId: string,
    itemId: string
  ): Promise<ApiResponse<TrashItem>> => {
    return apiClient.doc.post(`/workspaces/${workspaceId}/restore/${itemId}`);
  },

  deleteFromTrash: async (workspaceId: string, itemId: string): Promise<ApiResponse<string>> => {
    return apiClient.doc.delete(`/workspaces/${workspaceId}/trash/${itemId}`);
  },

  emptyTrash: async (workspaceId: string): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.doc.post(`/workspaces/${workspaceId}/empty-trash`);
  },

  // ==================== 搜索与统计 ====================

  searchWorkspace: async (
    workspaceId: string,
    params?: {
      q?: string;
      type?: 'folder' | 'document';
      date_from?: string;
      date_to?: string;
      modified_by?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<DocTreeNode>>> => {
    return apiClient.doc.get(`/workspaces/${workspaceId}/search`, { params });
  },

  getWorkspaceStats: async (workspaceId: string): Promise<ApiResponse<WorkspaceStats>> => {
    return apiClient.doc.get(`/workspaces/${workspaceId}/stats`);
  },
};

export default docWorkspaceApi;
