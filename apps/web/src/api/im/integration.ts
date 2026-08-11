/**
 * IM · 消息集成中心 API 绑定
 *
 * 后端: IM 服务 /integrations/*
 * 路由:
 *   POST   /integrations/ticket
 *   POST   /integrations/task
 *   POST   /integrations/calendar
 *   POST   /integrations/approval
 *   POST   /integrations/webhooks/{trigger}
 *   GET    /integrations/history
 *   GET    /integrations/history/{id}
 *   DELETE /integrations/history/{id}
 *   GET    /integrations/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type IntegrationTarget = 'ticket' | 'task' | 'calendar' | 'approval' | 'webhook';
export type IntegrationStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type WebhookTriggerType =
  'message_received' | 'message_mention' | 'reaction_added' | 'file_shared' | 'custom';

export interface IntegrationRecord {
  id: string;
  source_message_id: string;
  source_chat_id: string;
  source_sender_id: string;
  source_sender_name: string;
  target_type: IntegrationTarget;
  target_id: string;
  target_url?: string;
  status: IntegrationStatus;
  action: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface CreateTicketFromMessageRequest {
  message_id: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assignee_id?: string;
  due_date?: string;
  labels?: string[];
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export interface CreateTaskFromMessageRequest {
  message_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  project_id?: string;
  parent_task_id?: string;
  tags?: string[];
}

export interface CreateCalendarEventFromMessageRequest {
  message_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  attendees?: string[];
  is_all_day?: boolean;
  reminder_minutes?: number;
  calendar_id?: string;
}

export interface CreateApprovalFromMessageRequest {
  message_id: string;
  approval_type: string;
  title: string;
  description?: string;
  approver_id: string;
  due_date?: string;
  priority?: 'normal' | 'urgent';
  attachment_ids?: string[];
  form_data?: Record<string, unknown>;
}

export interface TriggerWebhookRequest {
  message_id: string;
  trigger_type: WebhookTriggerType;
  webhook_id: string;
  custom_payload?: Record<string, unknown>;
}

export interface IntegrationHistoryQuery {
  target_type?: IntegrationTarget;
  status?: IntegrationStatus;
  from_date?: string;
  to_date?: string;
  user_id?: string;
  page?: number;
  pagesize?: number;
}

export interface IntegrationStats {
  total_integrations_today: number;
  total_integrations_week: number;
  by_target: Record<IntegrationTarget, number>;
  by_status: Record<IntegrationStatus, number>;
  success_rate: number;
  avg_processing_time_ms: number;
  top_integrators: Array<{ user_id: string; user_name: string; count: number }>;
}

export const imIntegrationApi = {
  // ==================== 消息转工单 ====================

  createTicketFromMessage: async (
    data: CreateTicketFromMessageRequest
  ): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.post('/integrations/ticket', data);
  },

  // ==================== 消息转任务 ====================

  createTaskFromMessage: async (
    data: CreateTaskFromMessageRequest
  ): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.post('/integrations/task', data);
  },

  // ==================== 消息转日程 ====================

  createCalendarEventFromMessage: async (
    data: CreateCalendarEventFromMessageRequest
  ): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.post('/integrations/calendar', data);
  },

  // ==================== 消息转审批 ====================

  createApprovalFromMessage: async (
    data: CreateApprovalFromMessageRequest
  ): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.post('/integrations/approval', data);
  },

  // ==================== Webhook 触发 ====================

  triggerWebhookFromMessage: async (
    data: TriggerWebhookRequest
  ): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.post('/integrations/webhooks/trigger', data);
  },

  // ==================== 集成历史 ====================

  listIntegrationHistory: async (
    params?: IntegrationHistoryQuery
  ): Promise<ApiResponse<PaginatedResponse<IntegrationRecord>>> => {
    return apiClient.im.get('/integrations/history', { params });
  },

  getIntegrationRecord: async (id: string): Promise<ApiResponse<IntegrationRecord>> => {
    return apiClient.im.get(`/integrations/history/${id}`);
  },

  deleteIntegrationRecord: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/integrations/history/${id}`);
  },

  // ==================== 统计 ====================

  getIntegrationStats: async (): Promise<ApiResponse<IntegrationStats>> => {
    return apiClient.im.get('/integrations/stats');
  },
};

export default imIntegrationApi;
