/**
 * IM · 消息表情反应与 @提及 API 绑定
 *
 * 后端: IM 服务 /messages/* /reactions/* /mentions/* /starred/*
 * 路由:
 *   GET    /messages/{id}/reactions
 *   POST   /messages/{id}/reactions
 *   DELETE /messages/{id}/reactions/{reaction_id}
 *   GET    /messages/{id}/reactions/summary
 *   GET    /conversations/{id}/mentions
 *   GET    /conversations/{id}/mentions/unread-count
 *   PUT    /conversations/{id}/mentions/read-all
 *   POST   /messages/{id}/mentions
 *   DELETE /messages/{id}/mentions/{mention_id}
 *   GET    /messages/starred
 *   POST   /messages/{id}/star
 *   DELETE /messages/{id}/star
 *   GET    /messages/emoji-categories
 *   GET    /messages/{id}/pinned
 *   POST   /messages/{id}/pin
 *   DELETE /messages/{id}/pin
 *   GET    /conversations/{id}/pinned-messages
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ReactionType = 'emoji' | 'custom';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  emoji: string;
  reaction_type: ReactionType;
  custom_data?: Record<string, unknown>;
  created_at: string;
}

export interface ReactionSummary {
  message_id: string;
  total_count: number;
  by_emoji: Array<{
    emoji: string;
    count: number;
    reacted: boolean;
    users: Array<{ id: string; name: string }>;
  }>;
  my_reactions: string[];
}

export interface Mention {
  id: string;
  message_id: string;
  chat_id: string;
  mentioned_user_id: string;
  mentioned_user_name: string;
  mentioner_id: string;
  mentioner_name: string;
  is_read: boolean;
  message_preview: string;
  created_at: string;
}

export interface CreateMentionRequest {
  mentioned_user_id: string;
  start_index: number;
  end_index: number;
  display_text: string;
}

export interface StarredMessage {
  id: string;
  message_id: string;
  chat_id: string;
  chat_name: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  created_at: string;
  starred_at: string;
  note?: string;
}

export interface PinMessageRequest {
  expires_at?: string;
  note?: string;
}

export const imReactionApi = {
  // ==================== 表情反应 ====================

  listReactions: async (messageId: string): Promise<ApiResponse<MessageReaction[]>> => {
    return apiClient.im.get(`/messages/${messageId}/reactions`);
  },

  addReaction: async (
    messageId: string,
    data: { emoji: string; reaction_type?: ReactionType; custom_data?: Record<string, unknown> }
  ): Promise<ApiResponse<MessageReaction>> => {
    return apiClient.im.post(`/messages/${messageId}/reactions`, data);
  },

  removeReaction: async (messageId: string, reactionId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/messages/${messageId}/reactions/${reactionId}`);
  },

  getReactionSummary: async (messageId: string): Promise<ApiResponse<ReactionSummary>> => {
    return apiClient.im.get(`/messages/${messageId}/reactions/summary`);
  },

  toggleReaction: async (
    messageId: string,
    data: { emoji: string }
  ): Promise<ApiResponse<{ added: boolean; reaction?: MessageReaction }>> => {
    return apiClient.im.post(`/messages/${messageId}/reactions/toggle`, data);
  },

  listAvailableEmojis: async (params?: {
    category?: string;
    search?: string;
  }): Promise<
    ApiResponse<
      Array<{
        category: string;
        emojis: Array<{ emoji: string; name: string; keywords: string[] }>;
      }>
    >
  > => {
    return apiClient.im.get('/messages/emoji-categories', { params });
  },

  // ==================== @提及 ====================

  listMentions: async (
    chatId: string,
    params?: {
      is_read?: boolean;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<Mention>>> => {
    return apiClient.im.get(`/conversations/${chatId}/mentions`, { params });
  },

  getUnreadMentionCount: async (chatId: string): Promise<ApiResponse<{ unread: number }>> => {
    return apiClient.im.get(`/conversations/${chatId}/mentions/unread-count`);
  },

  markMentionsRead: async (chatId: string): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.put(`/conversations/${chatId}/mentions/read-all`);
  },

  createMention: async (
    messageId: string,
    data: CreateMentionRequest
  ): Promise<ApiResponse<Mention>> => {
    return apiClient.im.post(`/messages/${messageId}/mentions`, data);
  },

  removeMention: async (messageId: string, mentionId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/messages/${messageId}/mentions/${mentionId}`);
  },

  // ==================== 消息收藏 ====================

  listStarredMessages: async (params?: {
    chat_id?: string;
    keyword?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<StarredMessage>>> => {
    return apiClient.im.get('/messages/starred', { params });
  },

  starMessage: async (
    messageId: string,
    data?: { note?: string }
  ): Promise<ApiResponse<StarredMessage>> => {
    return apiClient.im.post(`/messages/${messageId}/star`, data || {});
  },

  unstarMessage: async (messageId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/messages/${messageId}/star`);
  },

  updateStarNote: async (messageId: string, note: string): Promise<ApiResponse<StarredMessage>> => {
    return apiClient.im.put(`/messages/${messageId}/star`, { note });
  },

  // ==================== 置顶消息 ====================

  listPinnedMessages: async (
    chatId: string
  ): Promise<
    ApiResponse<
      Array<{
        id: string;
        message_id: string;
        pinned_by: string;
        pinned_at: string;
        expires_at?: string;
        note?: string;
      }>
    >
  > => {
    return apiClient.im.get(`/conversations/${chatId}/pinned-messages`);
  },

  pinMessage: async (
    messageId: string,
    data?: PinMessageRequest
  ): Promise<ApiResponse<{ id: string; message_id: string; pinned_at: string }>> => {
    return apiClient.im.post(`/messages/${messageId}/pin`, data || {});
  },

  unpinMessage: async (messageId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/messages/${messageId}/pin`);
  },

  getMessagePinStatus: async (
    messageId: string
  ): Promise<ApiResponse<{ pinned: boolean; pinned_at?: string; pinned_by?: string }>> => {
    return apiClient.im.get(`/messages/${messageId}/pinned`);
  },
};

export default imReactionApi;
