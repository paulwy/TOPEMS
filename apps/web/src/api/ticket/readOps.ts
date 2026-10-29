import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 ticket 5 条（2026-10-29）──
export const ticketReadApi = {
  getFeedback: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/api/ticket/feedbacks/{id}'),
  getWorkflows: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/api/ticket/workflows'),
  listTagDirectory: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/api/ticket/ticket-tags'),
  getAttachmentsByType: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/api/ticket/tickets/{id}/attachments/type/{file_type}'),
  getAttachmentsByType2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.ticket.get('/tickets/{id}/attachments/type/{file_type}'),
};