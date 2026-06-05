import apiClient from './client';
import type { ApiResponse } from './client';
import config from '../config/runtime';

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

export interface CreateChatMessageRequest {
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
  created_at: string;
  updated_at: string;
}

export interface CreateChatRoomRequest {
  name?: string;
  room_type: string;
  members: string[];
  created_by: string;
}

export interface ProjectGroup {
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

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationRequest {
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
  related_id?: string;
  related_type?: string;
}

export const imApi = {
  listChatRooms: async (): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>('/api/v1/chat-rooms');
  },
  createChatRoom: async (data: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>('/api/v1/chat-rooms', data);
  },
  getChatRoom: async (id: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.get<ChatRoom>(`/api/v1/chat-rooms/${id}`);
  },
  listChatMessages: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/v1/chat-rooms/${chatId}/messages`);
  },
  createChatMessage: async (data: CreateChatMessageRequest): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.post<ChatMessage>(`/api/v1/chat-rooms/${data.chat_id}/messages`, data);
  },
  markMessageRead: async (id: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/api/v1/chat-messages/${id}/read`);
  },

  getChatRoomMembers: async (chatRoomId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/v1/chat-rooms/${chatRoomId}/members`);
  },

  addChatRoomMember: async (chatRoomId: string, userId: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>(`/api/v1/chat-rooms/${chatRoomId}/members`, { user_id: userId });
  },

  removeChatRoomMember: async (chatRoomId: string, userId: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.delete<ChatRoom>(`/api/v1/chat-rooms/${chatRoomId}/members/${userId}`);
  },

  listProjectGroups: async (): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>('/api/v1/project-groups');
  },
  createProjectGroup: async (data: CreateProjectGroupRequest): Promise<ApiResponse<ProjectGroup>> => {
    return apiClient.im.post<ProjectGroup>('/api/v1/project-groups', data);
  },

  listNotifications: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/v1/notifications/${userId}`);
  },
  createNotification: async (data: CreateNotificationRequest): Promise<ApiResponse<Notification>> => {
    return apiClient.im.post<Notification>('/api/v1/notifications', data);
  },
  markNotificationRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.im.put<Notification>(`/api/v1/notifications/${id}/read`);
  },
  markAllNotificationsRead: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/v1/notifications/${userId}/read-all`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.im.get<string>('/health');
  },

  uploadFile: async (formData: FormData): Promise<ApiResponse<any>> => {
    const baseURL = config.services.im;
    const response = await fetch(`${baseURL}/api/v1/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    return response.json();
  },

  getUserOnlineStatus: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/v1/users/${userId}/online-status`);
  },
};
