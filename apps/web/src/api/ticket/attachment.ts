/**
 * Ticket · 工单附件 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   GET    /tickets/{id}/attachments
 *   POST   /tickets/{id}/attachments
 *   DELETE /tickets/{id}/attachments/{attachment_id}
 *   POST   /tickets/{id}/attachments/batch
 *   GET    /tickets/{id}/attachments/{attachment_id}/download
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  tenant_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  storage_path?: string;
  uploader_id: string;
  uploader_name?: string;
  description?: string;
  is_private: boolean;
  created_at: string;
}

export interface UploadAttachmentRequest {
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  is_private?: boolean;
  storage_path?: string;
}

export const attachmentApi = {
  listAttachments: async (ticketId: string): Promise<ApiResponse<TicketAttachment[]>> => {
    return apiClient.portal.get(`/tickets/${ticketId}/attachments`);
  },

  getAttachment: async (
    ticketId: string,
    attachmentId: string
  ): Promise<ApiResponse<TicketAttachment>> => {
    return apiClient.portal.get(`/tickets/${ticketId}/attachments/${attachmentId}`);
  },

  uploadAttachment: async (
    ticketId: string,
    data: UploadAttachmentRequest | FormData
  ): Promise<ApiResponse<TicketAttachment>> => {
    return apiClient.portal.post(`/tickets/${ticketId}/attachments`, data);
  },

  updateAttachment: async (
    ticketId: string,
    attachmentId: string,
    data: { description?: string; is_private?: boolean }
  ): Promise<ApiResponse<TicketAttachment>> => {
    return apiClient.portal.put(`/tickets/${ticketId}/attachments/${attachmentId}`, data);
  },

  deleteAttachment: async (
    ticketId: string,
    attachmentId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.portal.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
  },

  downloadAttachment: async (ticketId: string, attachmentId: string): Promise<Blob> => {
    const response = await apiClient.portal.get(
      `/tickets/${ticketId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
    return response.data as unknown as Blob;
  },

  batchUploadAttachments: async (
    ticketId: string,
    files: UploadAttachmentRequest[]
  ): Promise<ApiResponse<TicketAttachment[]>> => {
    return apiClient.portal.post(`/tickets/${ticketId}/attachments/batch`, {
      files,
    });
  },

  batchDeleteAttachments: async (
    ticketId: string,
    attachmentIds: string[]
  ): Promise<ApiResponse<{ deleted_count: number }>> => {
    return apiClient.portal.delete(`/tickets/${ticketId}/attachments/batch`, {
      data: { ids: attachmentIds },
    });
  },

  getAttachmentsByType: async (
    ticketId: string,
    fileType: string
  ): Promise<ApiResponse<TicketAttachment[]>> => {
    return apiClient.portal.get(`/tickets/${ticketId}/attachments`, {
      params: { file_type: fileType },
    });
  },

  getAttachmentCount: async (
    ticketId: string
  ): Promise<ApiResponse<{ count: number; total_size: number }>> => {
    return apiClient.portal.get(`/tickets/${ticketId}/attachments/stats`);
  },
};

export default attachmentApi;
