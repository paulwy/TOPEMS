import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  message_type: string;
  content: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  is_read: boolean;
}

interface CreateChatMessageRequest {
  chat_id: string;
  sender_id: string;
  sender_name: string;
  message_type: string;
  content: string;
  file_url?: string;
  file_name?: string;
}

export interface ChatRoom {
  id: string;
  name?: string;
  room_type: string;
  members: string[];
  created_by: string;
  last_message?: string;
  last_message_time?: string;
  is_muted?: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChatRoomRequest {
  name?: string;
  room_type: string;
  members: string[];
  created_by: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  members: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectGroupRequest {
  name: string;
  description?: string;
  project_id?: string;
  members: string[];
  created_by: string;
}


// ==================== 聚合 API ====================

export const imApi = {
  // ==================== 核心聊天 ====================

  listChatRooms: async (): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>('/rooms');
  },
  createChatRoom: async (data: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>('/rooms', data);
  },
  getChatRoom: async (id: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.get<ChatRoom>(`/rooms/${id}`);
  },
  deleteChatRoom: async (id: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/rooms/${id}`);
  },
  listChatMessages: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/rooms/${chatId}/messages`);
  },
  // 消息搜索：后端路由 GET /rooms/{id}/messages/search（响应 data 为消息数组）
  searchChatMessages: async (
    chatRoomId: string,
    keyword: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/rooms/${chatRoomId}/messages/search`, {
      params: { keyword },
    });
  },
  createChatMessage: async (data: CreateChatMessageRequest): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.post<ChatMessage>(`/rooms/${data.chat_id}/messages`, data);
  },
  updateChatMessage: async (id: string, content: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/messages/${id}`, {
      content,
    });
  },
  deleteChatMessage: async (id: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/messages/${id}`);
  },

  // ==================== 成员管理（兼容保留） ====================

  getChatRoomMembers: async (chatRoomId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/rooms/${chatRoomId}/members`);
  },
  addChatRoomMember: async (chatRoomId: string, userId: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>(`/rooms/${chatRoomId}/members`, {
      user_id: userId,
    });
  },
  listProjectGroups: async (): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>('/project-groups');
  },
  createProjectGroup: async (
    data: CreateProjectGroupRequest
  ): Promise<ApiResponse<ProjectGroup>> => {
    return apiClient.im.post<ProjectGroup>('/project-groups', data);
  },

  // ==================== 通知 ====================

  listNotifications: async (userId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/notifications/${userId}`);
  },
  getUserOnlineStatus: async (userId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/online-status/${userId}`);
  },

  // ==================== 好友/联系人 ====================

  muteChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/mute`);
  },
  pinChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/pin`);
  },
};

export default imApi;
