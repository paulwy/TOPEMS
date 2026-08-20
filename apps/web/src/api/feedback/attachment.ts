/**
 * Feedback · 附件管理 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedbacks/{id}/attachments
 *   POST   /feedbacks/{id}/attachments
 *   DELETE /feedbacks/{id}/attachments/{attachment_id}
 *   POST   /feedbacks/{id}/attachments/bulk-delete
 *   GET    /feedbacks/attachments/{attachment_id}/download
 *   POST   /feedbacks/attachments/bulk-upload
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

interface FeedbackAttachment {
  id: string;
  feedback_id: string;
  tenant_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  created_at: string;
}

interface UploadAttachmentRequest {
  file: File | Blob;
  description?: string;
}

interface BulkUploadResult {
  total: number;
  succeeded: number;
  failed: number;
  attachments: FeedbackAttachment[];
  errors: Array<{ file_name: string; error: string }>;
}

export const attachmentApi = {
  listAttachments: async (feedbackId: string): Promise<ApiResponse<FeedbackAttachment[]>> => {
    return apiClient.feedback.get(`/feedbacks/${feedbackId}/attachments`);
  },

  uploadAttachment: async (
    feedbackId: string,
    data: UploadAttachmentRequest
  ): Promise<ApiResponse<FeedbackAttachment>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.description) {
      formData.append('description', data.description);
    }
    return apiClient.feedback.post(`/feedbacks/${feedbackId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAttachment: async (
    feedbackId: string,
    attachmentId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.feedback.delete(`/feedbacks/${feedbackId}/attachments/${attachmentId}`);
  },

  bulkDeleteAttachments: async (
    feedbackId: string,
    attachmentIds: string[]
  ): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.feedback.post(`/feedbacks/${feedbackId}/attachments/bulk-delete`, {
      attachment_ids: attachmentIds,
    });
  },

  downloadAttachment: async (
    attachmentId: string
  ): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.feedback.get(`/feedbacks/attachments/${attachmentId}/download`);
  },

  bulkUploadAttachments: async (
    feedbackId: string,
    files: Array<{ file: File | Blob; description?: string }>
  ): Promise<ApiResponse<BulkUploadResult>> => {
    const formData = new FormData();
    files.forEach((f, index) => {
      formData.append(`files[${index}]`, f.file);
      if (f.description) {
        formData.append(`descriptions[${index}]`, f.description);
      }
    });
    return apiClient.feedback.post(`/feedbacks/${feedbackId}/attachments/bulk-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default attachmentApi;
