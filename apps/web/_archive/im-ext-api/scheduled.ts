import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

// ==================== 类型定义 ====================

export type ScheduledMessageStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface ScheduledMessage {
  id: string;
  chat_id: string;
  chat_name?: string;
  message_id?: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'link';
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  scheduled_at: string;
  status: ScheduledMessageStatus;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  sent_at?: string;
  failure_reason?: string;
  target_user_ids?: string[];
  target_role_ids?: string[];
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  repeat_end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessageRequest {
  chat_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'link';
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  scheduled_at: string;
  target_user_ids?: string[];
  target_role_ids?: string[];
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  repeat_end_at?: string;
}

export interface UpdateScheduledMessageRequest {
  content?: string;
  scheduled_at?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  target_user_ids?: string[];
  target_role_ids?: string[];
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  repeat_end_at?: string;
}

export interface ScheduledMessageQuery {
  chat_id?: string;
  status?: ScheduledMessageStatus;
  from_date?: string;
  to_date?: string;
  page?: number;
  pagesize?: number;
}

interface BatchScheduledRequest {
  ids: string[];
}

export interface ScheduledMessageStats {
  total_pending: number;
  total_sent_today: number;
  total_failed_today: number;
  total_cancelled: number;
  by_chat: Array<{
    chat_id: string;
    chat_name: string;
    count: number;
  }>;
  by_sender: Array<{
    user_id: string;
    user_name: string;
    count: number;
  }>;
  upcoming_count: number;
}

// ==================== API 函数 ====================

export const imScheduledApi = {
  /**
   * 创建定时消息
   * POST /im/scheduled-messages
   */
  createScheduledMessage: async (
    data: CreateScheduledMessageRequest
  ): Promise<ApiResponse<ScheduledMessage>> => {
    return apiClient.im.post('/im/scheduled-messages', data);
  },

  /**
   * 列出定时消息（当前用户）
   * GET /im/scheduled-messages
   */
  listScheduledMessages: async (
    params?: ScheduledMessageQuery
  ): Promise<ApiResponse<PaginatedResponse<ScheduledMessage>>> => {
    return apiClient.im.get('/im/scheduled-messages', { params });
  },

  /**
   * 获取定时消息详情
   * GET /im/scheduled-messages/:id
   */
  getScheduledMessage: async (id: string): Promise<ApiResponse<ScheduledMessage>> => {
    return apiClient.im.get(`/im/scheduled-messages/${id}`);
  },

  /**
   * 更新定时消息
   * PUT /im/scheduled-messages/:id
   */
  updateScheduledMessage: async (
    id: string,
    data: UpdateScheduledMessageRequest
  ): Promise<ApiResponse<ScheduledMessage>> => {
    return apiClient.im.put(`/im/scheduled-messages/${id}`, data);
  },

  /**
   * 删除定时消息
   * DELETE /im/scheduled-messages/:id
   */
  deleteScheduledMessage: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.im.delete(`/im/scheduled-messages/${id}`);
  },

  /**
   * 立即发送定时消息（跳过等待）
   * POST /im/scheduled-messages/:id/send
   */
  sendScheduledMessageNow: async (id: string): Promise<ApiResponse<ScheduledMessage>> => {
    return apiClient.im.post(`/im/scheduled-messages/${id}/send`);
  },

  /**
   * 取消定时消息
   * POST /im/scheduled-messages/:id/cancel
   */
  cancelScheduledMessage: async (id: string): Promise<ApiResponse<ScheduledMessage>> => {
    return apiClient.im.post(`/im/scheduled-messages/${id}/cancel`);
  },

  /**
   * 批量立即发送
   * POST /im/scheduled-messages/batch-send
   */
  batchSendScheduledMessages: async (
    data: BatchScheduledRequest
  ): Promise<ApiResponse<{ sent_count: number }>> => {
    return apiClient.im.post('/im/scheduled-messages/batch-send', data);
  },

  /**
   * 批量删除定时消息
   * POST /im/scheduled-messages/batch-delete
   */
  batchDeleteScheduledMessages: async (
    data: BatchScheduledRequest
  ): Promise<ApiResponse<{ deleted_count: number }>> => {
    return apiClient.im.post('/im/scheduled-messages/batch-delete', data);
  },

  /**
   * 获取定时消息统计
   * GET /im/scheduled-messages/stats
   */
  getScheduledMessageStats: async (): Promise<ApiResponse<ScheduledMessageStats>> => {
    return apiClient.im.get('/im/scheduled-messages/stats');
  },
};

export default imScheduledApi;
