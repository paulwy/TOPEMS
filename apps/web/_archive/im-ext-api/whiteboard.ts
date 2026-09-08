/**
 * IM · 会议白板协同 API 绑定
 *
 * 后端: IM 服务 /whiteboards/*
 * 路由:
 *   GET    /whiteboards
 *   POST   /whiteboards
 *   GET    /whiteboards/{id}
 *   PUT    /whiteboards/{id}
 *   DELETE /whiteboards/{id}
 *   POST   /whiteboards/{id}/snapshot
 *   GET    /whiteboards/{id}/snapshots
 *   GET    /whiteboards/{id}/snapshots/{snapshot_id}
 *   POST   /whiteboards/{id}/snapshots/{snapshot_id}/restore
 *   POST   /whiteboards/{id}/export
 *   POST   /whiteboards/{id}/share
 *   GET    /whiteboards/{id}/collaborators
 *   POST   /whiteboards/{id}/collaborators
 *   DELETE /whiteboards/{id}/collaborators/{user_id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type WhiteboardToolType =
  | 'pen'
  | 'highlight'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'sticky_note'
  | 'eraser'
  | 'shapes';
type WhiteboardStatus = 'active' | 'archived' | 'deleted';
type WhiteboardPermission = 'view' | 'edit' | 'admin' | 'owner';
export type ExportFormat = 'png' | 'pdf' | 'svg' | 'jpeg';

export interface Whiteboard {
  id: string;
  conference_id: string;
  conference_title: string;
  title: string;
  description?: string;
  status: WhiteboardStatus;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  width: number;
  height: number;
  current_snapshot_id?: string;
  snapshot_count: number;
  collaborator_count: number;
  view_count: number;
  last_edited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWhiteboardRequest {
  conference_id: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
  collaborator_ids?: string[];
  is_private?: boolean;
}

export interface WhiteboardSnapshot {
  id: string;
  whiteboard_id: string;
  whiteboard_title: string;
  name: string;
  description?: string;
  created_by: string;
  created_by_name: string;
  tool_used_count: number;
  object_count: number;
  file_size_bytes: number;
  thumbnail_url?: string;
  created_at: string;
}

interface CreateSnapshotRequest {
  name?: string;
  description?: string;
  auto_save?: boolean;
}

interface WhiteboardCollaborator {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  permission: WhiteboardPermission;
  is_active: boolean;
  cursor_position?: { x: number; y: number };
  last_active_at?: string;
  joined_at: string;
}

interface ShareWhiteboardRequest {
  user_ids: string[];
  permission: WhiteboardPermission;
  message?: string;
  send_notification?: boolean;
}

interface ExportWhiteboardRequest {
  format: ExportFormat;
  width?: number;
  height?: number;
  include_grid?: boolean;
  include_background?: boolean;
  scale?: number;
}

export interface WhiteboardStats {
  total_whiteboards_today: number;
  total_whiteboards_active: number;
  total_snapshots_today: number;
  total_collaborations_today: number;
  by_tool_type: Record<WhiteboardToolType, number>;
  avg_session_duration_minutes: number;
}

export const imWhiteboardApi = {
  // ==================== 白板 CRUD ====================

  listWhiteboards: async (params?: {
    conference_id?: string;
    status?: WhiteboardStatus;
    created_by?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Whiteboard>>> => {
    return apiClient.im.get('/whiteboards', { params });
  },

  createWhiteboard: async (data: CreateWhiteboardRequest): Promise<ApiResponse<Whiteboard>> => {
    return apiClient.im.post('/whiteboards', data);
  },

  getWhiteboard: async (id: string): Promise<ApiResponse<Whiteboard>> => {
    return apiClient.im.get(`/whiteboards/${id}`);
  },

  updateWhiteboard: async (
    id: string,
    data: Partial<Pick<Whiteboard, 'title' | 'description' | 'width' | 'height' | 'status'>>
  ): Promise<ApiResponse<Whiteboard>> => {
    return apiClient.im.put(`/whiteboards/${id}`, data);
  },

  deleteWhiteboard: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/whiteboards/${id}`);
  },

  // ==================== 快照管理 ====================

  createSnapshot: async (
    whiteboardId: string,
    data?: CreateSnapshotRequest
  ): Promise<ApiResponse<WhiteboardSnapshot>> => {
    return apiClient.im.post(`/whiteboards/${whiteboardId}/snapshot`, data || {});
  },

  listWhiteboardSnapshots: async (
    whiteboardId: string,
    params?: {
      from_date?: string;
      to_date?: string;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<WhiteboardSnapshot>>> => {
    return apiClient.im.get(`/whiteboards/${whiteboardId}/snapshots`, { params });
  },

  getWhiteboardSnapshot: async (
    whiteboardId: string,
    snapshotId: string
  ): Promise<ApiResponse<WhiteboardSnapshot>> => {
    return apiClient.im.get(`/whiteboards/${whiteboardId}/snapshots/${snapshotId}`);
  },

  restoreWhiteboardSnapshot: async (
    whiteboardId: string,
    snapshotId: string
  ): Promise<ApiResponse<Whiteboard>> => {
    return apiClient.im.post(`/whiteboards/${whiteboardId}/snapshots/${snapshotId}/restore`);
  },

  // ==================== 协作与共享 ====================

  listWhiteboardCollaborators: async (
    whiteboardId: string,
    params?: {
      permission?: WhiteboardPermission;
      is_active?: boolean;
    }
  ): Promise<ApiResponse<WhiteboardCollaborator[]>> => {
    return apiClient.im.get(`/whiteboards/${whiteboardId}/collaborators`, { params });
  },

  shareWhiteboard: async (
    whiteboardId: string,
    data: ShareWhiteboardRequest
  ): Promise<ApiResponse<WhiteboardCollaborator[]>> => {
    return apiClient.im.post(`/whiteboards/${whiteboardId}/share`, data);
  },

  removeWhiteboardCollaborator: async (
    whiteboardId: string,
    userId: string
  ): Promise<ApiResponse<{ removed: boolean }>> => {
    return apiClient.im.delete(`/whiteboards/${whiteboardId}/collaborators/${userId}`);
  },

  // ==================== 导出 ====================

  exportWhiteboard: async (
    whiteboardId: string,
    data: ExportWhiteboardRequest
  ): Promise<ApiResponse<{ url: string; file_size_bytes: number; format: string }>> => {
    return apiClient.im.post(`/whiteboards/${whiteboardId}/export`, data);
  },

  // ==================== 统计 ====================

  getWhiteboardStats: async (): Promise<ApiResponse<WhiteboardStats>> => {
    return apiClient.im.get('/whiteboards/stats');
  },
};

export default imWhiteboardApi;
