/**
 * Notification · 即时通讯 (IM) API 绑定
 *
 * 后端: svc/communication/src/im.rs
 * 路由前缀: /api/communication/im/*
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

type ChatRoomType = 'private' | 'group' | 'project' | 'system';

export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';

export interface ChatRoom {
  id: string;
  name?: string;
  room_type: ChatRoomType;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  message_type: MessageType;
  content: string;
  file_url?: string;
  is_recalled: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
  remark?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  member_ids: string[];
  created_at: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  project_id: string;
  member_ids: string[];
  created_at: string;
}

export interface ImNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  room_id?: string;
  sender_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface OnlineStatus {
  online: boolean;
  last_active?: string;
}

export interface CreateRoomRequest {
  name?: string;
  room_type?: ChatRoomType;
  member_ids?: string[];
}

interface UpdateRoomRequest {
  name?: string;
  room_type?: ChatRoomType;
}

export interface SendMessageRequest {
  content: string;
  message_type?: MessageType;
  file_url?: string;
}

interface UpdateMessageRequest {
  content?: string;
  message_type?: MessageType;
}

interface AddMemberRequest {
  user_id: string;
  role?: string;
}

export interface AddContactRequest {
  user_id?: string;
  name: string;
  phone?: string;
  email?: string;
  remark?: string;
}

export interface UpdateContactRequest {
  name?: string;
  phone?: string;
  email?: string;
  remark?: string;
}

export interface CreateContactGroupRequest {
  name: string;
  member_ids: string[];
}

interface UpdateContactGroupRequest {
  name?: string;
  member_ids?: string[];
}

export interface CreateProjectGroupRequest {
  name: string;
  project_id: string;
  member_ids: string[];
}

interface MuteRoomRequest {
  muted: boolean;
  duration_minutes?: number;
}

export interface PinMessageRequest {
  pinned: boolean;
}

export const imApi = {
  listRooms: async (): Promise<ApiResponse<ChatRoom[]>> => {
    return apiClient.notification.get('/im/rooms');
  },

  getRoom: async (id: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.notification.get(`/im/rooms/${id}`);
  },

  createRoom: async (data: CreateRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.notification.post('/im/rooms', data);
  },

  updateRoom: async (id: string, data: UpdateRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.notification.put(`/im/rooms/${id}`, data);
  },

  deleteRoom: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/im/rooms/${id}`);
  },

  getRoomMessages: async (id: string): Promise<ApiResponse<ChatMessage[]>> => {
    return apiClient.notification.get(`/im/rooms/${id}/messages`);
  },

  sendMessage: async (id: string, data: SendMessageRequest): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.notification.post(`/im/rooms/${id}/messages`, data);
  },

  searchRooms: async (query?: string): Promise<ApiResponse<ChatRoom[]>> => {
    return apiClient.notification.get('/im/rooms/search', {
      params: { query },
    });
  },

  searchMessages: async (id: string, query?: string): Promise<ApiResponse<ChatMessage[]>> => {
    return apiClient.notification.get(`/im/rooms/${id}/messages/search`, { params: { query } });
  },

  listRoomMembers: async (id: string): Promise<ApiResponse<ChatMember[]>> => {
    return apiClient.notification.get(`/im/rooms/${id}/members`);
  },

  addMember: async (id: string, data: AddMemberRequest): Promise<ApiResponse<void>> => {
    return apiClient.notification.post(`/im/rooms/${id}/members`, data);
  },

  removeMember: async (id: string, data: { user_id: string }): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/im/rooms/${id}/members`, {
      data,
    });
  },

  updateMessage: async (
    id: string,
    data: UpdateMessageRequest
  ): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.notification.put(`/im/messages/${id}`, data);
  },

  deleteMessage: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/im/messages/${id}`);
  },

  markMessagesRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.post(`/im/rooms/${id}/read`);
  },

  muteRoom: async (id: string, data: MuteRoomRequest): Promise<ApiResponse<void>> => {
    return apiClient.notification.post(`/im/rooms/${id}/mute`, data);
  },

  pinMessage: async (id: string, data: PinMessageRequest): Promise<ApiResponse<void>> => {
    return apiClient.notification.post(`/im/rooms/${id}/pin`, data);
  },

  listContacts: async (): Promise<ApiResponse<Contact[]>> => {
    return apiClient.notification.get('/im/contacts');
  },

  getContact: async (id: string): Promise<ApiResponse<Contact>> => {
    return apiClient.notification.get(`/im/contacts/${id}`);
  },

  addContact: async (data: AddContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.notification.post('/im/contacts', data);
  },

  updateContact: async (id: string, data: UpdateContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.notification.put(`/im/contacts/${id}`, data);
  },

  removeContact: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/im/contacts/${id}`);
  },

  getOnlineStatus: async (userId: string): Promise<ApiResponse<OnlineStatus>> => {
    return apiClient.notification.get(`/im/online-status/${userId}`);
  },

  listImNotifications: async (userId: string): Promise<ApiResponse<ImNotification[]>> => {
    return apiClient.notification.get(`/im/notifications/${userId}`);
  },

  listContactGroups: async (): Promise<ApiResponse<ContactGroup[]>> => {
    return apiClient.notification.get('/im/contact-groups');
  },

  createContactGroup: async (
    data: CreateContactGroupRequest
  ): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.notification.post('/im/contact-groups', data);
  },

  updateContactGroup: async (
    id: string,
    data: UpdateContactGroupRequest
  ): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.notification.put(`/im/contact-groups/${id}`, data);
  },

  deleteContactGroup: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/im/contact-groups/${id}`);
  },

  listProjectGroups: async (): Promise<ApiResponse<ProjectGroup[]>> => {
    return apiClient.notification.get('/im/project-groups');
  },

  createProjectGroup: async (
    data: CreateProjectGroupRequest
  ): Promise<ApiResponse<ProjectGroup>> => {
    return apiClient.notification.post('/im/project-groups', data);
  },
};

export default imApi;
