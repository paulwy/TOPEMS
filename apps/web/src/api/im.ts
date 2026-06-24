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

export interface Friend {
  id: string;
  friend_id: string;
  friend_name: string;
  status: 'pending' | 'accepted';
  created_at: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface CreateFriendRequest {
  friend_id: string;
  friend_name: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactGroupRequest {
  name: string;
}

export const imApi = {
  listChatRooms: async (): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>('/api/im/chat-rooms');
  },
  createChatRoom: async (data: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>('/api/im/chat-rooms', data);
  },
  getChatRoom: async (id: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.get<ChatRoom>(`/api/im/chat-rooms/${id}`);
  },
  deleteChatRoom: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.im.delete<any>(`/api/im/chat-rooms/${id}`);
  },
  listChatMessages: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/chat-rooms/${chatId}/messages`);
  },
  createChatMessage: async (data: CreateChatMessageRequest): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.post<ChatMessage>(`/api/im/chat-rooms/${data.chat_id}/messages`, data);
  },
  markMessageRead: async (id: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/api/im/chat-messages/${id}/read`);
  },

  updateChatMessage: async (id: string, content: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/api/im/chat-messages/${id}`, {
      content,
    });
  },

  deleteChatMessage: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.im.delete<any>(`/api/im/chat-messages/${id}`);
  },

  getChatRoomMembers: async (chatRoomId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/chat-rooms/${chatRoomId}/members`);
  },

  addChatRoomMember: async (chatRoomId: string, userId: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>(`/api/im/chat-rooms/${chatRoomId}/members`, {
      user_id: userId,
    });
  },

  removeChatRoomMember: async (
    chatRoomId: string,
    userId: string
  ): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.delete<ChatRoom>(`/api/im/chat-rooms/${chatRoomId}/members/${userId}`);
  },

  listProjectGroups: async (): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>('/api/im/project-groups');
  },
  createProjectGroup: async (
    data: CreateProjectGroupRequest
  ): Promise<ApiResponse<ProjectGroup>> => {
    return apiClient.im.post<ProjectGroup>('/api/im/project-groups', data);
  },

  listNotifications: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/notifications/${userId}`);
  },
  createNotification: async (
    data: CreateNotificationRequest
  ): Promise<ApiResponse<Notification>> => {
    return apiClient.im.post<Notification>('/api/im/notifications', data);
  },
  markNotificationRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.im.put<Notification>(`/api/im/notifications/${id}/read`);
  },
  markAllNotificationsRead: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/notifications/${userId}/read-all`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.im.get<string>('/health');
  },

  uploadFile: async (formData: FormData): Promise<ApiResponse<any>> => {
    const baseURL = config.services.im;
    const response = await fetch(`${baseURL}/api/im/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    return response.json();
  },

  getUserOnlineStatus: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/users/${userId}/online-status`);
  },

  listFriends: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/friends/${userId}`);
  },

  sendFriendRequest: async (
    userId: string,
    data: CreateFriendRequest
  ): Promise<ApiResponse<any>> => {
    return apiClient.im.post<any>(`/api/im/friends/${userId}`, data);
  },

  acceptFriendRequest: async (userId: string, friendId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/friends/${userId}/${friendId}/accept`);
  },

  rejectFriendRequest: async (userId: string, friendId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/friends/${userId}/${friendId}/reject`);
  },

  removeFriend: async (userId: string, friendId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.delete<any>(`/api/im/friends/${userId}/${friendId}`);
  },

  listContactGroups: async (userId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.get<any>(`/api/im/contact-groups/${userId}`);
  },

  createContactGroup: async (
    userId: string,
    data: CreateContactGroupRequest
  ): Promise<ApiResponse<any>> => {
    return apiClient.im.post<any>(`/api/im/contact-groups/${userId}`, data);
  },

  updateContactGroup: async (
    userId: string,
    groupId: string,
    data: CreateContactGroupRequest
  ): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/contact-groups/${userId}/${groupId}`, data);
  },

  deleteContactGroup: async (userId: string, groupId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.delete<any>(`/api/im/contact-groups/${userId}/${groupId}`);
  },

  addContactGroupMember: async (
    userId: string,
    groupId: string,
    memberUserId: string
  ): Promise<ApiResponse<any>> => {
    return apiClient.im.post<any>(`/api/im/contact-groups/${userId}/${groupId}/members`, {
      user_id: memberUserId,
    });
  },

  removeContactGroupMember: async (
    userId: string,
    groupId: string,
    memberUserId: string
  ): Promise<ApiResponse<any>> => {
    return apiClient.im.delete<any>(
      `/api/im/contact-groups/${userId}/${groupId}/members/${memberUserId}`
    );
  },

  muteChatRoom: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/chat-rooms/${chatId}/mute`);
  },

  unmuteChatRoom: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/chat-rooms/${chatId}/unmute`);
  },

  pinChatRoom: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/chat-rooms/${chatId}/pin`);
  },

  unpinChatRoom: async (chatId: string): Promise<ApiResponse<any>> => {
    return apiClient.im.put<any>(`/api/im/chat-rooms/${chatId}/unpin`);
  },
};
