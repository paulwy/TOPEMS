/**
 * IM · 消息归档与导出 API 绑定
 *
 * 后端: IM 服务 /archives/* /exports/*
 * 路由:
 *   GET    /archives
 *   POST   /archives
 *   GET    /archives/{id}
 *   DELETE /archives/{id}
 *   POST   /archives/{id}/restore
 *   POST   /archives/bulk-archive
 *   POST   /archives/schedule
 *   DELETE /archives/schedule/{schedule_id}
 *   GET    /archives/schedules
 *   GET    /exports
 *   POST   /exports
 *   GET    /exports/{id}
 *   DELETE /exports/{id}
 *   GET    /exports/{id}/download
 *   POST   /exports/{id}/cancel
 *   GET    /archives/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ArchiveStatus = 'pending' | 'archiving' | 'archived' | 'failed' | 'expired';
export type ExportFormat = 'pdf' | 'html' | 'json' | 'csv' | 'docx' | 'zip';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ArchiveType = 'conversation' | 'channel' | 'group' | 'user';

export interface Archive {
  id: string;
  archive_type: ArchiveType;
  source_id: string;
  source_name: string;
  status: ArchiveStatus;
  start_date: string;
  end_date: string;
  message_count: number;
  file_size_bytes: number;
  compressed_size_bytes: number;
  retention_days: number;
  storage_path?: string;
  checksum?: string;
  created_by: string;
  created_by_name: string;
  archived_at?: string;
  restored_at?: string;
  expires_at?: string;
  error_message?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateArchiveRequest {
  archive_type: ArchiveType;
  source_ids: string[];
  start_date: string;
  end_date: string;
  retention_days?: number;
  compress?: boolean;
  include_attachments?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArchiveSchedule {
  id: string;
  name: string;
  is_active: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_config: {
    day_of_month?: number;
    day_of_week?: number;
    time: string;
  };
  archive_type: ArchiveType;
  source_ids: string[];
  date_range_type: 'last_7d' | 'last_30d' | 'last_90d' | 'custom';
  retention_days: number;
  compress: boolean;
  created_at: string;
  last_run_at?: string;
  next_run_at?: string;
}

export interface CreateArchiveScheduleRequest {
  name: string;
  schedule_type: ArchiveSchedule['schedule_type'];
  schedule_config: ArchiveSchedule['schedule_config'];
  archive_type: ArchiveType;
  source_ids: string[];
  date_range_type: ArchiveSchedule['date_range_type'];
  retention_days?: number;
  compress?: boolean;
}

export interface MessageExport {
  id: string;
  export_type: ArchiveType;
  source_id: string;
  source_name: string;
  format: ExportFormat;
  status: ExportStatus;
  start_date: string;
  end_date: string;
  message_count: number;
  file_size_bytes?: number;
  download_url?: string;
  download_expires_at?: string;
  include_attachments: boolean;
  include_reactions: boolean;
  include_edits: boolean;
  created_by: string;
  created_by_name: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  error_message?: string;
  progress_percent: number;
  created_at: string;
}

export interface CreateExportRequest {
  export_type: ArchiveType;
  source_ids: string[];
  format: ExportFormat;
  start_date: string;
  end_date: string;
  include_attachments?: boolean;
  include_reactions?: boolean;
  include_edits?: boolean;
  password_protected?: boolean;
  password?: string;
}

export interface ArchiveStats {
  total_archives: number;
  total_archived_messages: number;
  total_archived_size_bytes: number;
  active_archives: number;
  expiring_soon: number;
  archives_last_30d: number;
  by_type: Array<{ type: ArchiveType; count: number; size_bytes: number }>;
  by_month: Array<{ month: string; count: number; size_bytes: number }>;
  top_sources: Array<{ source_id: string; source_name: string; message_count: number }>;
}

export const imArchiveApi = {
  // ==================== 归档管理 ====================

  listArchives: async (params?: {
    archive_type?: ArchiveType;
    status?: ArchiveStatus;
    source_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Archive>>> => {
    return apiClient.im.get('/archives', { params });
  },

  createArchive: async (data: CreateArchiveRequest): Promise<ApiResponse<Archive>> => {
    return apiClient.im.post('/archives', data);
  },

  getArchive: async (id: string): Promise<ApiResponse<Archive>> => {
    return apiClient.im.get(`/archives/${id}`);
  },

  deleteArchive: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/archives/${id}`);
  },

  restoreArchive: async (
    id: string,
    data?: { restore_to?: string; merge?: boolean }
  ): Promise<ApiResponse<{ restored: number }>> => {
    return apiClient.im.post(`/archives/${id}/restore`, data || {});
  },

  // ==================== 批量归档 ====================

  bulkArchive: async (data: {
    conversation_ids?: string[];
    channel_ids?: string[];
    user_ids?: string[];
    start_date: string;
    end_date: string;
    retention_days?: number;
  }): Promise<ApiResponse<{ archived: number; archive_ids: string[] }>> => {
    return apiClient.im.post('/archives/bulk-archive', data);
  },

  // ==================== 归档计划 ====================

  listArchiveSchedules: async (): Promise<ApiResponse<ArchiveSchedule[]>> => {
    return apiClient.im.get('/archives/schedules');
  },

  createArchiveSchedule: async (
    data: CreateArchiveScheduleRequest
  ): Promise<ApiResponse<ArchiveSchedule>> => {
    return apiClient.im.post('/archives/schedule', data);
  },

  deleteArchiveSchedule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/archives/schedule/${id}`);
  },

  enableArchiveSchedule: async (id: string): Promise<ApiResponse<{ enabled: boolean }>> => {
    return apiClient.im.put(`/archives/schedule/${id}/enable`);
  },

  disableArchiveSchedule: async (id: string): Promise<ApiResponse<{ disabled: boolean }>> => {
    return apiClient.im.put(`/archives/schedule/${id}/disable`);
  },

  runArchiveSchedule: async (id: string): Promise<ApiResponse<{ executed: boolean }>> => {
    return apiClient.im.post(`/archives/schedule/${id}/run`);
  },

  // ==================== 消息导出 ====================

  listExports: async (params?: {
    export_type?: ArchiveType;
    format?: ExportFormat;
    status?: ExportStatus;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MessageExport>>> => {
    return apiClient.im.get('/exports', { params });
  },

  createExport: async (data: CreateExportRequest): Promise<ApiResponse<MessageExport>> => {
    return apiClient.im.post('/exports', data);
  },

  getExport: async (id: string): Promise<ApiResponse<MessageExport>> => {
    return apiClient.im.get(`/exports/${id}`);
  },

  downloadExport: async (
    id: string
  ): Promise<ApiResponse<{ download_url: string; expires_at: string }>> => {
    return apiClient.im.get(`/exports/${id}/download`);
  },

  cancelExport: async (id: string): Promise<ApiResponse<{ cancelled: boolean }>> => {
    return apiClient.im.post(`/exports/${id}/cancel`);
  },

  deleteExport: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/exports/${id}`);
  },

  // ==================== 统计 ====================

  getArchiveStats: async (): Promise<ApiResponse<ArchiveStats>> => {
    return apiClient.im.get('/archives/stats');
  },
};

export default imArchiveApi;
