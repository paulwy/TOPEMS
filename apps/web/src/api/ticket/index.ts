/**
 * Ticket · 工单管理 API 绑定
 *
 * 后端: svc/ticket/src/handlers.rs
 * 路由:
 *   GET    /tickets
 *   POST   /tickets
 *   GET    /tickets/{id}
 *   PUT    /tickets/{id}
 *   DELETE /tickets/{id}
 *   GET    /tickets/stats
 *   GET    /tickets/sla-stats
 *   ... 详见子模块文件
 */

import { apiClient } from '../client';
import { slaApi } from './sla';
import { commentApi } from './comment';
import { dashboardApi } from './dashboard';
import { workflowApi } from './workflow';
import { attachmentApi } from './attachment';
import { batchApi } from './batch';
import type {
  Ticket,
  TicketListResponse,
  TicketQuery,
  CreateTicketRequest,
  UpdateTicketRequest,
} from './types';

export type {
  Ticket,
  TicketComment,
  AddCommentRequest,
  TicketActivity,
  TicketListResponse,
  TicketStats,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketQuery,
  TicketSlaInfo,
  SlaEscalationEvent,
  TicketSlaPolicy,
  TicketSlaStats,
  CreateSlaPolicyRequest,
  UpdateSlaPolicyRequest,
} from './types';

export type { DashboardSummary, TrendPoint } from './dashboard';
export type {
  TicketTransition,
  TicketWorkflow,
  WorkflowStatus,
  WorkflowTransition,
  CreateTicketTransitionRequest,
  CreateWorkflowRequest,
} from './workflow';
export type { BatchResult } from './batch';

export const ticketApi = {
  // 基础工单操作（推荐通过 BFF）
  listTickets: (query?: TicketQuery) =>
    apiClient.portal.get<{ data: TicketListResponse }>('/tickets', { params: query }),

  getTicket: (id: string) => apiClient.portal.get<{ data: Ticket }>(`/tickets/${id}`),

  createTicket: (data: CreateTicketRequest) =>
    apiClient.portal.post<{ data: Ticket }>('/tickets', data),

  updateTicket: (id: string, data: UpdateTicketRequest) =>
    apiClient.portal.put<{ data: Ticket }>(`/tickets/${id}`, data),

  deleteTicket: (id: string) =>
    apiClient.portal.delete<{ data: { deleted: boolean } }>(`/tickets/${id}`),

  getStats: dashboardApi.getStats,

  // ==================== 直接访问 ticket 服务 ====================

  assignTicket: (id: string, assigneeId: string) =>
    apiClient.ticket.post<{ data: Ticket }>(`/tickets/${id}/assign`, {
      assignee_id: assigneeId,
    }),

  resolveTicket: (id: string, resolution?: string) =>
    apiClient.ticket.post<{ data: Ticket }>(`/tickets/${id}/resolve`, {
      resolution,
    }),

  closeTicket: (id: string, reason?: string) =>
    apiClient.ticket.post<{ data: Ticket }>(`/tickets/${id}/close`, { reason }),

  batchUpdate: (data: {
    ids: string[];
    status?: string;
    priority?: string;
    assignee_id?: string;
  }) => apiClient.ticket.post<{ data: { updated_count: number } }>('/tickets/batch-update', data),

  getMyTickets: (params?: { status?: string; page?: number; page_size?: number }) =>
    apiClient.ticket.get<{ data: TicketListResponse }>('/tickets/my', { params }),

  // SLA 子域
  sla: slaApi,
  getTicketSla: slaApi.getTicketSla,
  triggerSlaEscalation: slaApi.triggerSlaEscalation,
  getSlaStats: slaApi.getSlaStats,
  listSlaPolicies: slaApi.listSlaPolicies,
  getSlaPolicy: slaApi.getSlaPolicy,
  createSlaPolicy: slaApi.createSlaPolicy,
  updateSlaPolicy: slaApi.updateSlaPolicy,
  deleteSlaPolicy: slaApi.deleteSlaPolicy,

  // 评论与活动子域
  comments: commentApi,
  getComments: commentApi.listComments,
  addComment: (id: string, content: string) => commentApi.addComment(id, { content }),
  getActivities: commentApi.listActivities,

  // 统计与看板子域
  dashboard: dashboardApi,

  // 工单流转与自动化子域
  workflow: workflowApi,
  listTransitions: workflowApi.listTransitions,
  performTransition: workflowApi.performTransition,
  approveTicket: workflowApi.approveTicket,
  rejectTicket: workflowApi.rejectTicket,
  escalateTicket: workflowApi.escalateTicket,
  reassignTicket: workflowApi.reassignTicket,
  listWorkflows: workflowApi.listWorkflows,
  createWorkflow: workflowApi.createWorkflow,
  deleteWorkflow: workflowApi.deleteWorkflow,

  // 附件子域
  attachments: attachmentApi,
  listAttachments: attachmentApi.listAttachments,
  uploadAttachment: attachmentApi.uploadAttachment,
  deleteAttachment: attachmentApi.deleteAttachment,
  downloadAttachment: attachmentApi.downloadAttachment,

  // 批量操作与标签子域
  batch: batchApi,
  batchAssign: batchApi.batchAssign,
  batchClose: batchApi.batchClose,
  batchDelete: batchApi.batchDelete,
  batchEscalate: batchApi.batchEscalate,
  listTags: batchApi.listTags,
  createTag: batchApi.createTag,
  addTagToTicket: batchApi.addTagToTicket,
  removeTagFromTicket: batchApi.removeTagFromTicket,
};

export { slaApi, commentApi, dashboardApi, workflowApi, attachmentApi, batchApi };

export default ticketApi;
