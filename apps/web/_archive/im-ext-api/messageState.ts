/**
 * IM · 消息状态与交互 API 绑定
 *
 * 后端: IM 服务 /messages/* /typing/* /receipts/* /replies/* /edits/*
 * 路由:
 *   GET    /messages/{id}/receipts
 *   POST   /messages/{id}/read
 *   GET    /messages/{id}/delivery-status
 *   GET    /conversations/{id}/read-receipts
 *   POST   /conversations/{id}/typing
 *   DELETE /conversations/{id}/typing
 *   GET    /conversations/{id}/typing-users
 *   GET    /messages/{id}/replies
 *   POST   /messages/{id}/reply
 *   GET    /messages/{id}/quoted-message
 *   PUT    /messages/{id}
 *   GET    /messages/{id}/edit-history
 *   POST   /messages/{id}/restore
 *   GET    /conversations/{id}/draft
 *   PUT    /conversations/{id}/draft
 *   DELETE /conversations/{id}/draft
 *   GET    /messages/{id}/thread
 *   POST   /messages/{id}/thread/settings
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  read_at: string;
  device_id?: string;
}

export interface DeliveryReceipt {
  message_id: string;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  by_user: Array<{
    user_id: string;
    user_name: string;
    status: DeliveryStatus;
    delivered_at?: string;
    read_at?: string;
  }>;
}

export interface TypingUser {
  user_id: string;
  user_name: string;
  is_typing: boolean;
  last_typed_at: string;
  typing_type?: 'text' | 'attachment' | 'emoji';
}

export interface ReplyMessage {
  id: string;
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  quoted_message?: {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    message_type: string;
  };
  created_at: string;
  updated_at: string;
}

export interface EditHistoryEntry {
  id: string;
  original_content: string;
  edited_content: string;
  edited_by: string;
  edited_by_name: string;
  created_at: string;
}

export interface MessageDraft {
  chat_id: string;
  content: string;
  message_type: string;
  attachments?: Array<{ id: string; name: string; url: string; size: number }>;
  reply_to?: string;
  mentions?: Array<{ user_id: string; start_index: number; end_index: number }>;
  updated_at: string;
}

export interface ThreadInfo {
  id: string;
  root_message_id: string;
  reply_count: number;
  last_reply_at?: string;
  participants: Array<{ user_id: string; user_name: string }>;
  is_group_chat: boolean;
  thread_name?: string;
  unread_replies: number;
}

export const imMessageStateApi = {
  // ==================== 已读回执 ====================

  getReadReceipts: async (messageId: string): Promise<ApiResponse<ReadReceipt[]>> => {
    return apiClient.im.get(`/messages/${messageId}/receipts`);
  },

  markMessageRead: async (
    messageId: string,
    data?: { device_id?: string }
  ): Promise<ApiResponse<ReadReceipt>> => {
    return apiClient.im.post(`/messages/${messageId}/read`, data || {});
  },

  getDeliveryStatus: async (messageId: string): Promise<ApiResponse<DeliveryReceipt>> => {
    return apiClient.im.get(`/messages/${messageId}/delivery-status`);
  },

  getConversationReadReceipts: async (
    chatId: string,
    params?: {
      since_time?: string;
      user_id?: string;
    }
  ): Promise<ApiResponse<Array<{ message_id: string; read_by: string[]; read_at: string }>>> => {
    return apiClient.im.get(`/conversations/${chatId}/read-receipts`, { params });
  },

  // ==================== 输入状态 ====================

  sendTyping: async (
    chatId: string,
    data?: { typing_type?: 'text' | 'attachment' | 'emoji' }
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.im.post(`/conversations/${chatId}/typing`, data || {});
  },

  clearTyping: async (chatId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.im.delete(`/conversations/${chatId}/typing`);
  },

  getTypingUsers: async (chatId: string): Promise<ApiResponse<TypingUser[]>> => {
    return apiClient.im.get(`/conversations/${chatId}/typing-users`);
  },

  // ==================== 消息引用/回复 ====================

  getMessageReplies: async (
    messageId: string,
    params?: {
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ReplyMessage>>> => {
    return apiClient.im.get(`/messages/${messageId}/replies`, { params });
  },

  replyToMessage: async (
    messageId: string,
    data: {
      content: string;
      message_type?: string;
      attachments?: Array<{ name: string; url: string; size: number }>;
    }
  ): Promise<ApiResponse<ReplyMessage>> => {
    return apiClient.im.post(`/messages/${messageId}/reply`, data);
  },

  getQuotedMessage: async (
    messageId: string
  ): Promise<ApiResponse<ReplyMessage['quoted_message']>> => {
    return apiClient.im.get(`/messages/${messageId}/quoted-message`);
  },

  // ==================== 消息编辑 ====================

  editMessage: async (
    messageId: string,
    data: {
      content?: string;
      message_type?: string;
      attachments?: Array<{ name: string; url: string; size: number }>;
    }
  ): Promise<ApiResponse<{ id: string; edited: boolean; version: number }>> => {
    return apiClient.im.put(`/messages/${messageId}`, data);
  },

  getEditHistory: async (messageId: string): Promise<ApiResponse<EditHistoryEntry[]>> => {
    return apiClient.im.get(`/messages/${messageId}/edit-history`);
  },

  restoreMessageVersion: async (
    messageId: string,
    data: { version_id: string }
  ): Promise<ApiResponse<{ id: string; restored: boolean }>> => {
    return apiClient.im.post(`/messages/${messageId}/restore`, data);
  },

  // ==================== 草稿管理 ====================

  getDraft: async (chatId: string): Promise<ApiResponse<MessageDraft | null>> => {
    return apiClient.im.get(`/conversations/${chatId}/draft`);
  },

  saveDraft: async (
    chatId: string,
    data: Partial<MessageDraft>
  ): Promise<ApiResponse<MessageDraft>> => {
    return apiClient.im.put(`/conversations/${chatId}/draft`, data);
  },

  deleteDraft: async (chatId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/conversations/${chatId}/draft`);
  },

  // ==================== 话题/线程 ====================

  getMessageThread: async (messageId: string): Promise<ApiResponse<ThreadInfo>> => {
    return apiClient.im.get(`/messages/${messageId}/thread`);
  },

  updateThreadSettings: async (
    messageId: string,
    data: { thread_name?: string; is_group_chat?: boolean }
  ): Promise<ApiResponse<ThreadInfo>> => {
    return apiClient.im.put(`/messages/${messageId}/thread/settings`, data);
  },
};

export default imMessageStateApi;
