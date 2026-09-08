/**
 * IM · 在线状态 (Presence) API 绑定
 *
 * 后端: IM 服务 /presence/*
 * 路由:
 *   GET    /presence/status
 *   GET    /presence/status/{user_id}
 *   POST   /presence/status
 *   PUT    /presence/status
 *   DELETE /presence/status
 *   GET    /presence/batch-status
 *   POST   /presence/batch-status
 *   GET    /presence/contacts-online
 *   GET    /presence/channel-members-status/{channel_id}
 *   POST   /presence/subscribe
 *   DELETE /presence/subscribe
 *   GET    /presence/subscriptions
 *   POST   /presence/push-to-friends
 *   GET    /presence/settings
 *   PUT    /presence/settings
 *   POST   /presence/broadcast
 *   GET    /presence/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline' | 'invisible';
export type ActivityType = 'chat' | 'call' | 'channel' | 'bot' | 'custom';

export interface UserPresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  status: PresenceStatus;
  status_message?: string;
  is_online: boolean;
  last_active_at?: string;
  current_activity?: {
    type: ActivityType;
    title: string;
    description?: string;
    chat_id?: string;
    channel_id?: string;
  };
  device_info?: {
    device_type: string;
    platform: string;
    app_version: string;
  };
  expires_at?: string;
}

export interface UpdatePresenceRequest {
  status: PresenceStatus;
  status_message?: string;
  expires_at?: string;
  current_activity?: UserPresence['current_activity'];
}

export interface BatchPresenceResponse {
  presences: UserPresence[];
  online_count: number;
  offline_count: number;
}

export interface PresenceSettings {
  user_id: string;
  show_online_status: boolean;
  show_last_seen: boolean;
  allow_people_see_my_status: boolean;
  allow_strangers_to_contact: boolean;
  auto_away_after_minutes: number;
  auto_offline_after_minutes: number;
  busy_during_calls: boolean;
  share_activity: boolean;
  custom_statuses: Array<{
    status: PresenceStatus;
    message: string;
    emoji?: string;
  }>;
  blocked_users: string[];
  updated_at: string;
}

export interface PresenceSubscription {
  id: string;
  user_ids: string[];
  channel_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface PresenceStats {
  total_users: number;
  online_now: number;
  busy: number;
  away: number;
  offline: number;
  peak_online_last_7d: number;
  avg_session_duration_minutes: number;
  most_active_hour: number;
  most_active_day: number;
}

export const imPresenceApi = {
  // ==================== 状态管理 ====================

  getMyPresence: async (): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.get('/presence/status');
  },

  getUserPresence: async (userId: string): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.get(`/presence/status/${userId}`);
  },

  updateMyPresence: async (data: UpdatePresenceRequest): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.put('/presence/status', data);
  },

  goOnline: async (data?: {
    activity?: UpdatePresenceRequest['current_activity'];
  }): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.post('/presence/status', { status: 'online', ...data });
  },

  goOffline: async (): Promise<ApiResponse<{ offline: boolean }>> => {
    return apiClient.im.delete('/presence/status');
  },

  setBusy: async (message?: string): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.put('/presence/status', { status: 'busy', status_message: message });
  },

  setAway: async (message?: string): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.put('/presence/status', { status: 'away', status_message: message });
  },

  setInvisible: async (): Promise<ApiResponse<UserPresence>> => {
    return apiClient.im.put('/presence/status', { status: 'invisible' });
  },

  // ==================== 批量查询 ====================

  getBatchPresence: async (userIds: string[]): Promise<ApiResponse<BatchPresenceResponse>> => {
    return apiClient.im.post('/presence/batch-status', { user_ids: userIds });
  },

  getContactsPresence: async (params?: {
    include_offline?: boolean;
    status?: PresenceStatus;
  }): Promise<ApiResponse<PaginatedResponse<UserPresence>>> => {
    return apiClient.im.get('/presence/contacts-online', { params });
  },

  getChannelMembersPresence: async (
    channelId: string,
    params?: {
      include_offline?: boolean;
    }
  ): Promise<ApiResponse<UserPresence[]>> => {
    return apiClient.im.get(`/presence/channel-members-status/${channelId}`, { params });
  },

  // ==================== 订阅管理 ====================

  subscribePresence: async (data: {
    user_ids?: string[];
    channel_ids?: string[];
  }): Promise<ApiResponse<PresenceSubscription>> => {
    return apiClient.im.post('/presence/subscribe', data);
  },

  unsubscribePresence: async (data: {
    subscription_id?: string;
    user_ids?: string[];
    channel_ids?: string[];
  }): Promise<ApiResponse<{ unsubscribed: boolean }>> => {
    return apiClient.im.delete('/presence/subscribe', { data });
  },

  listPresenceSubscriptions: async (): Promise<ApiResponse<PresenceSubscription[]>> => {
    return apiClient.im.get('/presence/subscriptions');
  },

  // ==================== 推送与设置 ====================

  pushPresenceToFriends: async (): Promise<ApiResponse<{ pushed: number }>> => {
    return apiClient.im.post('/presence/push-to-friends');
  },

  getPresenceSettings: async (): Promise<ApiResponse<PresenceSettings>> => {
    return apiClient.im.get('/presence/settings');
  },

  updatePresenceSettings: async (
    data: Partial<PresenceSettings>
  ): Promise<ApiResponse<PresenceSettings>> => {
    return apiClient.im.put('/presence/settings', data);
  },

  broadcastPresence: async (data: {
    status: PresenceStatus;
    message?: string;
    target_user_ids?: string[];
    target_channel_ids?: string[];
  }): Promise<ApiResponse<{ broadcasted: number }>> => {
    return apiClient.im.post('/presence/broadcast', data);
  },

  // ==================== 统计 ====================

  getPresenceStats: async (): Promise<ApiResponse<PresenceStats>> => {
    return apiClient.im.get('/presence/stats');
  },
};

export default imPresenceApi;
