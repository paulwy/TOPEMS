/**
 * IM · 机器人管理 API 绑定
 *
 * 后端: IM 服务 /bots/*
 * 路由:
 *   GET    /bots
 *   POST   /bots
 *   GET    /bots/{id}
 *   PUT    /bots/{id}
 *   DELETE /bots/{id}
 *   GET    /bots/{id}/commands
 *   POST   /bots/{id}/commands
 *   PUT    /bots/{id}/commands/{command_id}
 *   DELETE /bots/{id}/commands/{command_id}
 *   GET    /bots/{id}/events
 *   POST   /bots/{id}/events
 *   PUT    /bots/{id}/events/{event_id}
 *   DELETE /bots/{id}/events/{event_id}
 *   GET    /bots/{id}/subscriptions
 *   POST   /bots/{id}/subscriptions
 *   DELETE /bots/{id}/subscriptions/{subscription_id}
 *   POST   /bots/{id}/enable
 *   POST   /bots/{id}/disable
 *   POST   /bots/{id}/test
 *   GET    /bots/{id}/logs
 *   GET    /bots/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type BotStatus = 'active' | 'inactive' | 'draft' | 'error';
export type BotTriggerType = 'command' | 'event' | 'keyword' | 'mention' | 'schedule';
export type BotCommandType = 'slash' | 'prefix' | 'natural';

export interface Bot {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  status: BotStatus;
  created_by: string;
  created_by_name: string;
  trigger_types: BotTriggerType[];
  command_prefix?: string;
  welcome_message?: string;
  error_message?: string;
  enabled_channels: string[];
  enabled_groups: string[];
  permissions: string[];
  webhook_url?: string;
  webhook_secret?: string;
  rate_limit_per_minute?: number;
  is_template: boolean;
  template_id?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBotRequest {
  name: string;
  description?: string;
  avatar_url?: string;
  trigger_types?: BotTriggerType[];
  command_prefix?: string;
  welcome_message?: string;
  error_message?: string;
  enabled_channels?: string[];
  permissions?: string[];
  webhook_url?: string;
}

export interface BotCommand {
  id: string;
  bot_id: string;
  command: string;
  command_type: BotCommandType;
  description: string;
  response_type: 'text' | 'rich' | 'card' | 'image';
  response_content: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBotCommandRequest {
  command: string;
  command_type: BotCommandType;
  description: string;
  response_type?: BotCommand['response_type'];
  response_content: string;
  is_active?: boolean;
}

export interface BotEvent {
  id: string;
  bot_id: string;
  event_type: string;
  description: string;
  trigger_condition?: Record<string, unknown>;
  action_type: 'send_message' | 'call_webhook' | 'update_data' | 'notify_user';
  action_config: Record<string, unknown>;
  is_active: boolean;
  last_triggered_at?: string;
  trigger_count: number;
  created_at: string;
}

export interface CreateBotEventRequest {
  event_type: string;
  description: string;
  trigger_condition?: Record<string, unknown>;
  action_type: BotEvent['action_type'];
  action_config: Record<string, unknown>;
  is_active?: boolean;
}

export interface BotSubscription {
  id: string;
  bot_id: string;
  channel_id: string;
  channel_type: 'chat' | 'channel' | 'group';
  subscribed_at: string;
  is_active: boolean;
}

export interface BotLog {
  id: string;
  bot_id: string;
  trigger_type: BotTriggerType;
  trigger_source: string;
  message_preview: string;
  action_taken: string;
  status: 'success' | 'error' | 'skipped';
  error_message?: string;
  response_time_ms: number;
  created_at: string;
}

export interface BotStats {
  total_bots: number;
  active_bots: number;
  total_triggers_7d: number;
  success_rate_7d: number;
  top_bots: Array<{ bot_id: string; bot_name: string; triggers: number }>;
}

export const imBotApi = {
  // ==================== 机器人 CRUD ====================

  listBots: async (params?: {
    status?: BotStatus;
    search?: string;
    is_template?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Bot>>> => {
    return apiClient.im.get('/bots', { params });
  },

  createBot: async (data: CreateBotRequest): Promise<ApiResponse<Bot>> => {
    return apiClient.im.post('/bots', data);
  },

  getBot: async (id: string): Promise<ApiResponse<Bot>> => {
    return apiClient.im.get(`/bots/${id}`);
  },

  updateBot: async (
    id: string,
    data: Partial<Omit<Bot, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'is_template'>>
  ): Promise<ApiResponse<Bot>> => {
    return apiClient.im.put(`/bots/${id}`, data);
  },

  deleteBot: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/bots/${id}`);
  },

  // ==================== 机器人状态 ====================

  enableBot: async (id: string): Promise<ApiResponse<{ enabled: boolean }>> => {
    return apiClient.im.post(`/bots/${id}/enable`);
  },

  disableBot: async (id: string): Promise<ApiResponse<{ disabled: boolean }>> => {
    return apiClient.im.post(`/bots/${id}/disable`);
  },

  testBot: async (
    id: string,
    data?: { message?: string; channel_id?: string }
  ): Promise<ApiResponse<{ test_result: string; response_time_ms: number }>> => {
    return apiClient.im.post(`/bots/${id}/test`, data || {});
  },

  cloneBot: async (id: string): Promise<ApiResponse<Bot>> => {
    return apiClient.im.post(`/bots/${id}/clone`);
  },

  // ==================== 命令管理 ====================

  listBotCommands: async (botId: string): Promise<ApiResponse<BotCommand[]>> => {
    return apiClient.im.get(`/bots/${botId}/commands`);
  },

  createBotCommand: async (
    botId: string,
    data: CreateBotCommandRequest
  ): Promise<ApiResponse<BotCommand>> => {
    return apiClient.im.post(`/bots/${botId}/commands`, data);
  },

  updateBotCommand: async (
    botId: string,
    commandId: string,
    data: Partial<CreateBotCommandRequest>
  ): Promise<ApiResponse<BotCommand>> => {
    return apiClient.im.put(`/bots/${botId}/commands/${commandId}`, data);
  },

  deleteBotCommand: async (botId: string, commandId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/bots/${botId}/commands/${commandId}`);
  },

  // ==================== 事件管理 ====================

  listBotEvents: async (botId: string): Promise<ApiResponse<BotEvent[]>> => {
    return apiClient.im.get(`/bots/${botId}/events`);
  },

  createBotEvent: async (
    botId: string,
    data: CreateBotEventRequest
  ): Promise<ApiResponse<BotEvent>> => {
    return apiClient.im.post(`/bots/${botId}/events`, data);
  },

  updateBotEvent: async (
    botId: string,
    eventId: string,
    data: Partial<CreateBotEventRequest>
  ): Promise<ApiResponse<BotEvent>> => {
    return apiClient.im.put(`/bots/${botId}/events/${eventId}`, data);
  },

  deleteBotEvent: async (botId: string, eventId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/bots/${botId}/events/${eventId}`);
  },

  // ==================== 订阅管理 ====================

  listBotSubscriptions: async (botId: string): Promise<ApiResponse<BotSubscription[]>> => {
    return apiClient.im.get(`/bots/${botId}/subscriptions`);
  },

  addBotSubscription: async (
    botId: string,
    data: { channel_id: string; channel_type: 'chat' | 'channel' | 'group' }
  ): Promise<ApiResponse<BotSubscription>> => {
    return apiClient.im.post(`/bots/${botId}/subscriptions`, data);
  },

  removeBotSubscription: async (
    botId: string,
    subscriptionId: string
  ): Promise<ApiResponse<{ removed: boolean }>> => {
    return apiClient.im.delete(`/bots/${botId}/subscriptions/${subscriptionId}`);
  },

  // ==================== 日志与统计 ====================

  listBotLogs: async (
    botId: string,
    params?: {
      status?: BotLog['status'];
      trigger_type?: BotTriggerType;
      from_time?: string;
      to_time?: string;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<BotLog>>> => {
    return apiClient.im.get(`/bots/${botId}/logs`, { params });
  },

  getBotStats: async (): Promise<ApiResponse<BotStats>> => {
    return apiClient.im.get('/bots/stats');
  },
};

export default imBotApi;
