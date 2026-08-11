/**
 * IM · 频道管理 API 绑定
 *
 * 后端: IM 服务 /channels/*
 * 路由:
 *   GET    /channels
 *   POST   /channels
 *   GET    /channels/{id}
 *   PUT    /channels/{id}
 *   DELETE /channels/{id}
 *   GET    /channels/{id}/members
 *   POST   /channels/{id}/members
 *   DELETE /channels/{id}/members/{member_id}
 *   PUT    /channels/{id}/members/{member_id}/role
 *   GET    /channels/{id}/bans
 *   POST   /channels/{id}/ban
 *   DELETE /channels/{id}/ban/{user_id}
 *   GET    /channels/{id}/invites
 *   POST   /channels/{id}/invites
 *   DELETE /channels/{id}/invites/{invite_id}
 *   POST   /channels/{id}/leave
 *   POST   /channels/{id}/archive
 *   POST   /channels/{id}/unarchive
 *   GET    /channels/{id}/pinned
 *   POST   /channels/{id}/pinned
 *   DELETE /channels/{id}/pinned/{message_id}
 *   GET    /channels/discover
 *   GET    /channels/{id}/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ChannelType = 'announcement' | 'discussion' | 'project' | 'team' | 'custom';

export type ChannelVisibility = 'public' | 'private';

export type ChannelMemberRole = 'owner' | 'admin' | 'moderator' | 'member' | 'subscriber';

export interface Channel {
  id: string;
  name: string;
  channel_type: ChannelType;
  visibility: ChannelVisibility;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_by_name: string;
  member_count: number;
  subscriber_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  slow_mode_enabled: boolean;
  slow_mode_seconds: number;
  message_history_duration_days?: number;
  allow_subscriber_messages: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelRequest {
  name: string;
  channel_type: ChannelType;
  visibility?: ChannelVisibility;
  description?: string;
  avatar_url?: string;
  member_ids?: string[];
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: ChannelMemberRole;
  joined_at: string;
  is_muted: boolean;
  muted_until?: string;
  has_joined: boolean;
  mention_count: number;
  last_active_at?: string;
}

export interface AddChannelMemberRequest {
  user_id: string;
  role?: ChannelMemberRole;
  send_notification?: boolean;
}

export interface ChannelInvite {
  id: string;
  channel_id: string;
  inviter_id: string;
  inviter_name: string;
  invitee_email?: string;
  invitee_user_id?: string;
  role: ChannelMemberRole;
  token: string;
  expires_at?: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface BanRecord {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  banned_by: string;
  banned_by_name: string;
  reason?: string;
  banned_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface ChannelStats {
  channel_id: string;
  total_messages: number;
  total_members: number;
  active_members_7d: number;
  messages_today: number;
  peak_hour: number;
  top_contributors: Array<{
    user_id: string;
    user_name: string;
    message_count: number;
  }>;
}

export interface DiscoverChannel {
  id: string;
  name: string;
  channel_type: ChannelType;
  description?: string;
  member_count: number;
  is_member: boolean;
  can_join: boolean;
  tags: string[];
  created_at: string;
}

export const imChannelApi = {
  // ==================== 频道 CRUD ====================

  listChannels: async (params?: {
    channel_type?: ChannelType;
    visibility?: ChannelVisibility;
    is_archived?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Channel>>> => {
    return apiClient.im.get('/channels', { params });
  },

  createChannel: async (data: CreateChannelRequest): Promise<ApiResponse<Channel>> => {
    return apiClient.im.post('/channels', data);
  },

  getChannel: async (id: string): Promise<ApiResponse<Channel>> => {
    return apiClient.im.get(`/channels/${id}`);
  },

  updateChannel: async (
    id: string,
    data: Partial<
      Pick<
        Channel,
        | 'name'
        | 'description'
        | 'avatar_url'
        | 'slow_mode_enabled'
        | 'slow_mode_seconds'
        | 'allow_subscriber_messages'
        | 'message_history_duration_days'
      >
    >
  ): Promise<ApiResponse<Channel>> => {
    return apiClient.im.put(`/channels/${id}`, data);
  },

  deleteChannel: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/channels/${id}`);
  },

  // ==================== 成员管理 ====================

  listChannelMembers: async (
    channelId: string,
    params?: {
      role?: ChannelMemberRole;
      search?: string;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ChannelMember>>> => {
    return apiClient.im.get(`/channels/${channelId}/members`, { params });
  },

  addChannelMember: async (
    channelId: string,
    data: AddChannelMemberRequest
  ): Promise<ApiResponse<ChannelMember>> => {
    return apiClient.im.post(`/channels/${channelId}/members`, data);
  },

  removeChannelMember: async (
    channelId: string,
    memberId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/channels/${channelId}/members/${memberId}`);
  },

  updateMemberRole: async (
    channelId: string,
    memberId: string,
    role: ChannelMemberRole
  ): Promise<ApiResponse<ChannelMember>> => {
    return apiClient.im.put(`/channels/${channelId}/members/${memberId}/role`, { role });
  },

  leaveChannel: async (channelId: string): Promise<ApiResponse<{ left: boolean }>> => {
    return apiClient.im.post(`/channels/${channelId}/leave`);
  },

  // ==================== 封禁管理 ====================

  listBans: async (
    channelId: string,
    params?: {
      is_active?: boolean;
    }
  ): Promise<ApiResponse<BanRecord[]>> => {
    return apiClient.im.get(`/channels/${channelId}/bans`, { params });
  },

  banUser: async (
    channelId: string,
    data: { user_id: string; reason?: string; duration_hours?: number }
  ): Promise<ApiResponse<BanRecord>> => {
    return apiClient.im.post(`/channels/${channelId}/ban`, data);
  },

  unbanUser: async (
    channelId: string,
    userId: string
  ): Promise<ApiResponse<{ unbanned: boolean }>> => {
    return apiClient.im.delete(`/channels/${channelId}/ban/${userId}`);
  },

  // ==================== 邀请管理 ====================

  listInvites: async (channelId: string): Promise<ApiResponse<ChannelInvite[]>> => {
    return apiClient.im.get(`/channels/${channelId}/invites`);
  },

  createInvite: async (
    channelId: string,
    data: {
      invitee_email?: string;
      invitee_user_id?: string;
      role?: ChannelMemberRole;
      expires_at?: string;
    }
  ): Promise<ApiResponse<ChannelInvite>> => {
    return apiClient.im.post(`/channels/${channelId}/invites`, data);
  },

  revokeInvite: async (
    channelId: string,
    inviteId: string
  ): Promise<ApiResponse<{ revoked: boolean }>> => {
    return apiClient.im.delete(`/channels/${channelId}/invites/${inviteId}`);
  },

  // ==================== 频道操作 ====================

  archiveChannel: async (channelId: string): Promise<ApiResponse<{ archived: boolean }>> => {
    return apiClient.im.post(`/channels/${channelId}/archive`);
  },

  unarchiveChannel: async (channelId: string): Promise<ApiResponse<{ unarchived: boolean }>> => {
    return apiClient.im.post(`/channels/${channelId}/unarchive`);
  },

  // ==================== 置顶消息 ====================

  listPinnedMessages: async (
    channelId: string
  ): Promise<
    ApiResponse<
      Array<{
        id: string;
        message_id: string;
        pinned_by: string;
        pinned_at: string;
        note?: string;
      }>
    >
  > => {
    return apiClient.im.get(`/channels/${channelId}/pinned`);
  },

  pinMessage: async (
    channelId: string,
    data: { message_id: string; note?: string }
  ): Promise<ApiResponse<{ id: string; pinned_at: string }>> => {
    return apiClient.im.post(`/channels/${channelId}/pinned`, data);
  },

  unpinMessage: async (
    channelId: string,
    messageId: string
  ): Promise<ApiResponse<{ unpinned: boolean }>> => {
    return apiClient.im.delete(`/channels/${channelId}/pinned/${messageId}`);
  },

  // ==================== 发现与统计 ====================

  discoverChannels: async (params?: {
    channel_type?: ChannelType;
    search?: string;
    tags?: string[];
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DiscoverChannel>>> => {
    return apiClient.im.get('/channels/discover', { params });
  },

  getChannelStats: async (channelId: string): Promise<ApiResponse<ChannelStats>> => {
    return apiClient.im.get(`/channels/${channelId}/stats`);
  },
};

export default imChannelApi;
