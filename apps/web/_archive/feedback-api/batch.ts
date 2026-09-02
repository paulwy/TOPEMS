/**
 * Feedback · 批量操作 API 绑定
 *
 * 路由:
 *   POST   /feedbacks/batch-status
 *   POST   /feedbacks/batch-assign
 *   POST   /feedbacks/batch-delete
 *   POST   /feedbacks/batch-resolve
 *   POST   /feedbacks/batch-close
 *   POST   /feedbacks/batch-tag
 *   DELETE /feedbacks/batch-tag
 *   POST   /feedbacks/export
 *   GET    /feedbacks/export/{id}
 *   POST   /feedbacks/import
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed' | 'rejected';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface BatchStatusRequest {
  ids: string[];
  status: FeedbackStatus;
  reason?: string;
}

export interface BatchAssignRequest {
  ids: string[];
  assignee_id: string;
}

export interface BatchTagRequest {
  ids: string[];
  tag_ids: string[];
}

export interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  failed_ids: Array<{
    id: string;
    error: string;
  }>;
}

export interface ExportRequest {
  format: ExportFormat;
  ids?: string[];
  filters?: {
    status?: FeedbackStatus;
    type?: string;
    category_id?: string;
    assignee_id?: string;
    from_date?: string;
    to_date?: string;
  };
  fields?: string[];
}

export interface ExportTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: ExportFormat;
  file_url?: string;
  file_size?: number;
  record_count: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface ImportRequest {
  file_url: string;
  mapping?: Record<string, string>;
  skip_errors?: boolean;
}

export interface ImportResult {
  total_records: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
}

export const batchApi = {
  batchChangeStatus: async (
    data: BatchStatusRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-status', data);
  },

  batchAssign: async (data: BatchAssignRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-assign', data);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-delete', { ids });
  },

  batchResolve: async (
    ids: string[],
    reason?: string
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-resolve', { ids, reason });
  },

  batchClose: async (
    ids: string[],
    reason?: string
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-close', { ids, reason });
  },

  batchAddTags: async (data: BatchTagRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.post('/feedbacks/batch-tag', data);
  },

  batchRemoveTags: async (data: BatchTagRequest): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.feedback.delete('/feedbacks/batch-tag', { data });
  },

  exportFeedbacks: async (data: ExportRequest): Promise<ApiResponse<ExportTask>> => {
    return apiClient.feedback.post('/feedbacks/export', data);
  },

  getExportStatus: async (id: string): Promise<ApiResponse<ExportTask>> => {
    return apiClient.feedback.get(`/feedbacks/export/${id}`);
  },

  importFeedbacks: async (data: ImportRequest): Promise<ApiResponse<ImportResult>> => {
    return apiClient.feedback.post('/feedbacks/import', data);
  },
};

export default batchApi;
