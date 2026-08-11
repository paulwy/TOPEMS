/**
 * IM · 屏幕共享 API 绑定
 *
 * 后端: IM 服务 /screen-shares/*
 * 路由:
 *   GET    /screen-shares
 *   POST   /screen-shares
 *   GET    /screen-shares/{id}
 *   POST   /screen-shares/{id}/start
 *   POST   /screen-shares/{id}/stop
 *   POST   /screen-shares/{id}/pause
 *   POST   /screen-shares/{id}/resume
 *   POST   /screen-shares/{id}/grant-control
 *   POST   /screen-shares/{id}/revoke-control
 *   GET    /screen-shares/{id}/viewers
 *   GET    /screen-shares/{id}/snapshot
 *   POST   /screen-shares/{id}/annotation
 *   GET    /screen-shares/permissions
 *   PUT    /screen-shares/permissions
 *   GET    /screen-shares/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ScreenShareStatus = 'starting' | 'active' | 'paused' | 'stopping' | 'ended' | 'error';
export type ScreenShareType = 'full-screen' | 'application' | 'window' | 'tab' | 'camera';
export type ShareQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ControlRole = 'viewer' | 'annotator' | 'controller';

export interface ScreenShare {
  id: string;
  conference_id: string;
  conference_title: string;
  sharer_id: string;
  sharer_name: string;
  sharer_avatar?: string;
  share_type: ScreenShareType;
  status: ScreenShareStatus;
  quality: ShareQuality;
  frame_rate: number;
  resolution: string;
  is_audio_sharing: boolean;
  started_at?: string;
  stopped_at?: string;
  paused_at?: string;
  resume_at?: string;
  duration_seconds?: number;
  viewer_count: number;
  controller_id?: string;
  controller_name?: string;
  has_annotation: boolean;
  annotations_count: number;
  screenshot_url?: string;
  permissions: ScreenSharePermissions;
}

export interface ScreenSharePermissions {
  allow_viewer_control: boolean;
  allow_annotation: boolean;
  allow_screenshot: boolean;
  allow_chat: boolean;
  max_viewers: number;
  require_approval_for_control: boolean;
  watermark_enabled: boolean;
  watermark_text?: string;
}

export interface CreateScreenShareRequest {
  conference_id: string;
  share_type: ScreenShareType;
  quality?: ShareQuality;
  frame_rate?: number;
  resolution?: string;
  is_audio_sharing?: boolean;
  permissions?: Partial<ScreenSharePermissions>;
}

export interface ScreenShareViewer {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  join_time: string;
  leave_time?: string;
  control_role: ControlRole;
  is_active: boolean;
}

export interface ScreenShareAnnotation {
  id: string;
  share_id: string;
  annotator_id: string;
  annotator_name: string;
  tool_type: 'pen' | 'highlight' | 'rectangle' | 'arrow' | 'text' | 'eraser';
  color: string;
  stroke_width: number;
  content: Record<string, unknown>;
  created_at: string;
}

export interface ScreenShareStats {
  total_shares_today: number;
  active_shares: number;
  total_viewers_today: number;
  avg_duration_seconds: number;
  by_type: Array<{ type: ScreenShareType; count: number }>;
  by_quality: Array<{ quality: ShareQuality; count: number }>;
  peak_viewers: number;
  most_active_hour: number;
}

export const imScreenShareApi = {
  // ==================== 屏幕共享管理 ====================

  listScreenShares: async (params?: {
    conference_id?: string;
    status?: ScreenShareStatus;
    share_type?: ScreenShareType;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ScreenShare>>> => {
    return apiClient.im.get('/screen-shares', { params });
  },

  startScreenShare: async (data: CreateScreenShareRequest): Promise<ApiResponse<ScreenShare>> => {
    return apiClient.im.post('/screen-shares', data);
  },

  getScreenShare: async (id: string): Promise<ApiResponse<ScreenShare>> => {
    return apiClient.im.get(`/screen-shares/${id}`);
  },

  stopScreenShare: async (id: string): Promise<ApiResponse<{ stopped: boolean }>> => {
    return apiClient.im.post(`/screen-shares/${id}/stop`);
  },

  pauseScreenShare: async (id: string): Promise<ApiResponse<{ paused: boolean }>> => {
    return apiClient.im.post(`/screen-shares/${id}/pause`);
  },

  resumeScreenShare: async (id: string): Promise<ApiResponse<{ resumed: boolean }>> => {
    return apiClient.im.post(`/screen-shares/${id}/resume`);
  },

  // ==================== 控制权限 ====================

  grantControl: async (id: string, userId: string): Promise<ApiResponse<ScreenShare>> => {
    return apiClient.im.post(`/screen-shares/${id}/grant-control`, { user_id: userId });
  },

  revokeControl: async (id: string): Promise<ApiResponse<ScreenShare>> => {
    return apiClient.im.post(`/screen-shares/${id}/revoke-control`);
  },

  // ==================== 观众管理 ====================

  listScreenShareViewers: async (
    shareId: string,
    params?: {
      is_active?: boolean;
    }
  ): Promise<ApiResponse<ScreenShareViewer[]>> => {
    return apiClient.im.get(`/screen-shares/${shareId}/viewers`, { params });
  },

  // ==================== 截图与标注 ====================

  getScreenShareSnapshot: async (
    shareId: string
  ): Promise<
    ApiResponse<{
      snapshot_url: string;
      captured_at: string;
      file_size_bytes: number;
    }>
  > => {
    return apiClient.im.get(`/screen-shares/${shareId}/snapshot`);
  },

  addScreenShareAnnotation: async (
    shareId: string,
    data: {
      tool_type: ScreenShareAnnotation['tool_type'];
      color: string;
      stroke_width?: number;
      content: Record<string, unknown>;
    }
  ): Promise<ApiResponse<ScreenShareAnnotation>> => {
    return apiClient.im.post(`/screen-shares/${shareId}/annotation`, data);
  },

  // ==================== 权限管理 ====================

  getScreenSharePermissions: async (): Promise<ApiResponse<ScreenSharePermissions>> => {
    return apiClient.im.get('/screen-shares/permissions');
  },

  updateScreenSharePermissions: async (
    data: Partial<ScreenSharePermissions>
  ): Promise<ApiResponse<ScreenSharePermissions>> => {
    return apiClient.im.put('/screen-shares/permissions', data);
  },

  // ==================== 统计 ====================

  getScreenShareStats: async (): Promise<ApiResponse<ScreenShareStats>> => {
    return apiClient.im.get('/screen-shares/stats');
  },
};

export default imScreenShareApi;
