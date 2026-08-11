/**
 * Notification · 通知分组与话题 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/groups
 *   POST   /notification/groups
 *   GET    /notification/groups/{id}
 *   PUT    /notification/groups/{id}
 *   DELETE /notification/groups/{id}
 *   GET    /notification/groups/{id}/members
 *   POST   /notification/groups/{id}/members
 *   DELETE /notification/groups/{id}/members/{user_id}
 *   POST   /notification/groups/{id}/broadcast
 *   GET    /notification/topics
 *   POST   /notification/topics/{id}/subscribe
 *   DELETE /notification/topics/{id}/subscribe
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type GroupType = 'team' | 'project' | 'department' | 'role' | 'custom';
export type TopicStatus = 'active' | 'archived' | 'muted';

export interface NotificationGroup {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: GroupType;
  member_count: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTopic {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  group_id?: string;
  event_type: string;
  subscriber_count: number;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  user_id: string;
  user_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  type: GroupType;
  is_private?: boolean;
  member_ids?: string[];
}

export interface CreateTopicRequest {
  name: string;
  description?: string;
  group_id?: string;
  event_type: string;
}

export const groupApi = {
  // ==================== 分组管理 ====================

  listGroups: async (params?: {
    type?: GroupType;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<NotificationGroup>>> => {
    return apiClient.notification.get('/notification/groups', { params });
  },

  getGroup: async (id: string): Promise<ApiResponse<NotificationGroup>> => {
    return apiClient.notification.get(`/notification/groups/${id}`);
  },

  createGroup: async (data: CreateGroupRequest): Promise<ApiResponse<NotificationGroup>> => {
    return apiClient.notification.post('/notification/groups', data);
  },

  updateGroup: async (
    id: string,
    data: Partial<Pick<CreateGroupRequest, 'name' | 'description' | 'is_private'>>
  ): Promise<ApiResponse<NotificationGroup>> => {
    return apiClient.notification.put(`/notification/groups/${id}`, data);
  },

  deleteGroup: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/groups/${id}`);
  },

  // ==================== 分组成员 ====================

  listGroupMembers: async (groupId: string): Promise<ApiResponse<GroupMember[]>> => {
    return apiClient.notification.get(`/notification/groups/${groupId}/members`);
  },

  addGroupMembers: async (
    groupId: string,
    userIds: string[]
  ): Promise<ApiResponse<{ added_count: number }>> => {
    return apiClient.notification.post(`/notification/groups/${groupId}/members`, {
      user_ids: userIds,
    });
  },

  removeGroupMember: async (
    groupId: string,
    userId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/groups/${groupId}/members/${userId}`);
  },

  setGroupMemberRole: async (
    groupId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<ApiResponse<GroupMember>> => {
    return apiClient.notification.put(`/notification/groups/${groupId}/members/${userId}`, {
      role,
    });
  },

  broadcastToGroup: async (
    groupId: string,
    data: { title: string; content: string; notification_type?: string }
  ): Promise<ApiResponse<{ sent_count: number }>> => {
    return apiClient.notification.post(`/notification/groups/${groupId}/broadcast`, data);
  },

  // ==================== 话题/订阅源 ====================

  listTopics: async (params?: {
    group_id?: string;
    event_type?: string;
    status?: TopicStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<NotificationTopic>>> => {
    return apiClient.notification.get('/notification/topics', { params });
  },

  getTopic: async (id: string): Promise<ApiResponse<NotificationTopic>> => {
    return apiClient.notification.get(`/notification/topics/${id}`);
  },

  createTopic: async (data: CreateTopicRequest): Promise<ApiResponse<NotificationTopic>> => {
    return apiClient.notification.post('/notification/topics', data);
  },

  updateTopic: async (
    id: string,
    data: Partial<Pick<CreateTopicRequest, 'name' | 'description' | 'group_id'>>
  ): Promise<ApiResponse<NotificationTopic>> => {
    return apiClient.notification.put(`/notification/topics/${id}`, data);
  },

  deleteTopic: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/topics/${id}`);
  },

  subscribeToTopic: async (topicId: string): Promise<ApiResponse<{ subscribed: boolean }>> => {
    return apiClient.notification.post(`/notification/topics/${topicId}/subscribe`);
  },

  unsubscribeFromTopic: async (
    topicId: string
  ): Promise<ApiResponse<{ unsubscribed: boolean }>> => {
    return apiClient.notification.delete(`/notification/topics/${topicId}/subscribe`);
  },

  getMyTopics: async (): Promise<ApiResponse<NotificationTopic[]>> => {
    return apiClient.notification.get('/notification/my-topics');
  },

  listGroupTopics: async (groupId: string): Promise<ApiResponse<NotificationTopic[]>> => {
    return apiClient.notification.get(`/notification/groups/${groupId}/topics`);
  },
};

export default groupApi;
