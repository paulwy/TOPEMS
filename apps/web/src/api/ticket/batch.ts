/**
 * Ticket · 批量操作与标签 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs (通过 Portal BFF 代理)
 * 路由:
 *   POST   /tickets/batch-update
 *   POST   /tickets/batch-assign
 *   POST   /tickets/batch-close
 *   POST   /tickets/batch-delete
 *   POST   /tickets/batch-escalate
 *   GET    /ticket-tags
 *   POST   /ticket-tags
 *   PUT    /ticket-tags/{id}
 *   DELETE /ticket-tags/{id}
 *   POST   /tickets/{id}/tags
 *   DELETE /tickets/{id}/tags/{tag_id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Ticket, TicketListResponse } from './types';

interface TicketTag {
  id: string;
  tenant_id: string;
  name: string;
  color?: string;
  description?: string;
  usage_count: number;
  created_at: string;
}

export interface BatchUpdateRequest {
  ids: string[];
  status?: string;
  severity?: string;
  priority?: string;
  assignee_id?: string;
  sla_hours?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface BatchResult {
  success_count: number;
  failed_count: number;
  errors?: Array<{ id: string; error: string }>;
}

export const batchApi = {
  // ==================== 批量操作 ====================

  batchUpdate: async (data: BatchUpdateRequest): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-update', data);
  },

  batchAssign: async (
    ticketIds: string[],
    assigneeId: string,
    reason?: string
  ): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-assign', {
      ids: ticketIds,
      assignee_id: assigneeId,
      reason,
    });
  },

  batchClose: async (ticketIds: string[], reason?: string): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-close', {
      ids: ticketIds,
      reason,
    });
  },

  batchDelete: async (ticketIds: string[]): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.delete('/tickets/batch-delete', {
      data: { ids: ticketIds },
    });
  },

  batchEscalate: async (
    ticketIds: string[],
    reason?: string
  ): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-escalate', {
      ids: ticketIds,
      reason,
    });
  },

  batchChangePriority: async (
    ticketIds: string[],
    priority: string
  ): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-update', {
      ids: ticketIds,
      priority,
    });
  },

  batchAddTags: async (ticketIds: string[], tags: string[]): Promise<ApiResponse<BatchResult>> => {
    return apiClient.ticket.post('/tickets/batch-update', {
      ids: ticketIds,
      tags,
    });
  },

  // ==================== 标签管理 ====================

  listTags: async (): Promise<ApiResponse<TicketTag[]>> => {
    return apiClient.ticket.get('/ticket-tags');
  },

  createTag: async (data: {
    name: string;
    color?: string;
    description?: string;
  }): Promise<ApiResponse<TicketTag>> => {
    return apiClient.ticket.post('/ticket-tags', data);
  },

  updateTag: async (
    id: string,
    data: Partial<{ name: string; color: string; description: string }>
  ): Promise<ApiResponse<TicketTag>> => {
    return apiClient.ticket.put(`/ticket-tags/${id}`, data);
  },

  deleteTag: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.ticket.delete(`/ticket-tags/${id}`);
  },

  addTagToTicket: async (ticketId: string, tagId: string): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.post(`/tickets/${ticketId}/tags`, {
      tag_id: tagId,
    });
  },

  removeTagFromTicket: async (ticketId: string, tagId: string): Promise<ApiResponse<Ticket>> => {
    return apiClient.ticket.delete(`/tickets/${ticketId}/tags/${tagId}`);
  },

  getTicketsByTag: async (
    tagId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<TicketListResponse>> => {
    return apiClient.ticket.get('/tickets', {
      params: { tag_id: tagId, ...params },
    });
  },
};

export default batchApi;
