/**
 * IM · 群组增强管理 API 绑定
 *
 * 后端: IM 服务 /rooms/{id}/*
 * 路由:
 *   GET    /rooms/{id}/members
 *   POST   /rooms/{id}/members
 *   DELETE /rooms/{id}/members/{user_id}
 *   PUT    /rooms/{id}/members/{user_id}/role
 *   POST   /rooms/{id}/members/batch
 *   POST   /rooms/{id}/transfer
 *   GET    /rooms/{id}/settings
 *   PUT    /rooms/{id}/settings
 *   GET    /rooms/{id}/permissions
 *   PUT    /rooms/{id}/permissions/{role}
 *   GET    /rooms/{id}/events
 *   POST   /rooms/search
 *   GET    /rooms/{id}/invite-link
 *   POST   /rooms/{id}/invite-link
 *   DELETE /rooms/{id}/invite-link
 *   POST   /rooms/{id}/leave
 *   POST   /rooms/{id}/archive
 *   POST   /rooms/{id}/unarchive
 *   POST   /rooms/{id}/clear-history
 *   GET    /rooms/{id}/pinned-messages
 *   POST   /rooms/{id}/pinned-messages
 *   DELETE /rooms/{id}/pinned-messages/{message_id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export type JoinMode = 'invite_only' | 'request' | 'public' | 'domain';

export type PermissionLevel = 'all_members' | 'admins_only' | 'owner_only';

export interface GroupMember {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: GroupRole;
  nickname?: string;
  is_muted: boolean;
  muted_until?: string;
  joined_at: string;
  last_activity?: string;
  message_count?: number;
}

export interface GroupSettings {
  room_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  topic?: string;
  join_mode: JoinMode;
  visibility: 'private' | 'public' | 'searchable';
  require_approval: boolean;
  allow_members_invite: boolean;
  allow_members_mention_all: boolean;
  allow_file_sharing: boolean;
  allow_editing: boolean;
  allow_deleting: boolean;
  allow_reactions: boolean;
  max_members: number;
  message_retention_days?: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupSettingsRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  topic?: string;
  join_mode?: JoinMode;
  visibility?: 'private' | 'public' | 'searchable';
  require_approval?: boolean;
  allow_members_invite?: boolean;
  allow_members_mention_all?: boolean;
  allow_file_sharing?: boolean;
  allow_editing?: boolean;
  allow_deleting?: boolean;
  allow_reactions?: boolean;
  max_members?: number;
  message_retention_days?: number;
}

export interface GroupPermissions {
  room_id: string;
  send_messages: PermissionLevel;
  send_media: PermissionLevel;
  invite_members: PermissionLevel;
  change_settings: PermissionLevel;
  delete_messages: PermissionLevel;
  mention_all: PermissionLevel;
  pin_messages: PermissionLevel;
  mute_members: PermissionLevel;
  kick_members: PermissionLevel;
}

export interface UpdatePermissionsRequest {
  send_messages?: PermissionLevel;
  send_media?: PermissionLevel;
  invite_members?: PermissionLevel;
  change_settings?: PermissionLevel;
  delete_messages?: PermissionLevel;
  mention_all?: PermissionLevel;
  pin_messages?: PermissionLevel;
  mute_members?: PermissionLevel;
  kick_members?: PermissionLevel;
}

export interface GroupEvent {
  id: string;
  room_id: string;
  event_type:
    | 'member_joined'
    | 'member_left'
    | 'role_changed'
    | 'settings_changed'
    | 'message_pinned'
    | 'message_unpinned'
    | 'room_created'
    | 'room_deleted'
    | 'member_muted'
    | 'member_unmuted';
  actor_id: string;
  actor_name?: string;
  target_id?: string;
  target_name?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface InviteLink {
  room_id: string;
  invite_url: string;
  token: string;
  created_by: string;
  max_uses?: number;
  use_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface PinnedMessage {
  id: string;
  message_id: string;
  room_id: string;
  pinned_by: string;
  pinned_by_name?: string;
  pinned_at: string;
  message?: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  };
}

export const imGroupApi = {
  // ==================== 成员管理 ====================

  listMembers: async (
    roomId: string,
    params?: {
      role?: GroupRole;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<GroupMember>>> => {
    return apiClient.im.get(`/rooms/${roomId}/members`, { params });
  },

  addMember: async (
    roomId: string,
    data: { user_id: string; nickname?: string; role?: GroupRole }
  ): Promise<ApiResponse<GroupMember>> => {
    return apiClient.im.post(`/rooms/${roomId}/members`, data);
  },

  removeMember: async (roomId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/rooms/${roomId}/members/${userId}`);
  },

  updateMemberRole: async (
    roomId: string,
    userId: string,
    role: GroupRole
  ): Promise<ApiResponse<GroupMember>> => {
    return apiClient.im.put(`/rooms/${roomId}/members/${userId}/role`, { role });
  },

  updateMemberNickname: async (
    roomId: string,
    userId: string,
    nickname: string
  ): Promise<ApiResponse<GroupMember>> => {
    return apiClient.im.put(`/rooms/${roomId}/members/${userId}/nickname`, { nickname });
  },

  muteMember: async (
    roomId: string,
    userId: string,
    data?: { duration_minutes?: number; reason?: string }
  ): Promise<ApiResponse<GroupMember>> => {
    return apiClient.im.post(`/rooms/${roomId}/members/${userId}/mute`, data || {});
  },

  unmuteMember: async (roomId: string, userId: string): Promise<ApiResponse<GroupMember>> => {
    return apiClient.im.delete(`/rooms/${roomId}/members/${userId}/mute`);
  },

  batchAddMembers: async (
    roomId: string,
    data: { user_ids: string[]; role?: GroupRole }
  ): Promise<ApiResponse<{ added: number; members: GroupMember[] }>> => {
    return apiClient.im.post(`/rooms/${roomId}/members/batch`, data);
  },

  batchRemoveMembers: async (
    roomId: string,
    userIds: string[]
  ): Promise<ApiResponse<{ removed: number }>> => {
    return apiClient.im.post(`/rooms/${roomId}/members/batch-remove`, { user_ids: userIds });
  },

  transferOwnership: async (
    roomId: string,
    newOwnerId: string
  ): Promise<ApiResponse<{ room_id: string; new_owner_id: string }>> => {
    return apiClient.im.post(`/rooms/${roomId}/transfer`, { new_owner_id: newOwnerId });
  },

  // ==================== 群组设置 ====================

  getSettings: async (roomId: string): Promise<ApiResponse<GroupSettings>> => {
    return apiClient.im.get(`/rooms/${roomId}/settings`);
  },

  updateSettings: async (
    roomId: string,
    data: CreateGroupSettingsRequest
  ): Promise<ApiResponse<GroupSettings>> => {
    return apiClient.im.put(`/rooms/${roomId}/settings`, data);
  },

  // ==================== 权限管理 ====================

  getPermissions: async (roomId: string): Promise<ApiResponse<GroupPermissions>> => {
    return apiClient.im.get(`/rooms/${roomId}/permissions`);
  },

  updatePermissions: async (
    roomId: string,
    data: UpdatePermissionsRequest
  ): Promise<ApiResponse<GroupPermissions>> => {
    return apiClient.im.put(`/rooms/${roomId}/permissions`, data);
  },

  // ==================== 邀请链接 ====================

  getInviteLink: async (roomId: string): Promise<ApiResponse<InviteLink | null>> => {
    return apiClient.im.get(`/rooms/${roomId}/invite-link`);
  },

  createInviteLink: async (
    roomId: string,
    data?: { max_uses?: number; expires_at?: string }
  ): Promise<ApiResponse<InviteLink>> => {
    return apiClient.im.post(`/rooms/${roomId}/invite-link`, data || {});
  },

  revokeInviteLink: async (roomId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/rooms/${roomId}/invite-link`);
  },

  // ==================== 置顶消息 ====================

  listPinnedMessages: async (roomId: string): Promise<ApiResponse<PinnedMessage[]>> => {
    return apiClient.im.get(`/rooms/${roomId}/pinned-messages`);
  },

  pinMessage: async (roomId: string, messageId: string): Promise<ApiResponse<PinnedMessage>> => {
    return apiClient.im.post(`/rooms/${roomId}/pinned-messages`, { message_id: messageId });
  },

  unpinMessage: async (roomId: string, messageId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/rooms/${roomId}/pinned-messages/${messageId}`);
  },

  // ==================== 群组操作 ====================

  leaveGroup: async (roomId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.post(`/rooms/${roomId}/leave`);
  },

  archiveGroup: async (roomId: string): Promise<ApiResponse<GroupSettings>> => {
    return apiClient.im.post(`/rooms/${roomId}/archive`);
  },

  unarchiveGroup: async (roomId: string): Promise<ApiResponse<GroupSettings>> => {
    return apiClient.im.post(`/rooms/${roomId}/unarchive`);
  },

  clearHistory: async (
    roomId: string,
    data?: { before_date?: string }
  ): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.im.post(`/rooms/${roomId}/clear-history`, data || {});
  },

  // ==================== 事件与日志 ====================

  listGroupEvents: async (
    roomId: string,
    params?: {
      event_type?: GroupEvent['event_type'];
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<GroupEvent>>> => {
    return apiClient.im.get(`/rooms/${roomId}/events`, { params });
  },

  // ==================== 搜索 ====================

  searchGroups: async (params: {
    q: string;
    type?: 'all' | 'private' | 'public';
    page?: number;
    pagesize?: number;
  }): Promise<
    ApiResponse<
      PaginatedResponse<{ id: string; name: string; member_count: number; description?: string }>
    >
  > => {
    return apiClient.im.post('/rooms/search', params);
  },
};

export default imGroupApi;
