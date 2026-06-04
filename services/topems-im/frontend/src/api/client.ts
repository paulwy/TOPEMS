import axios from 'axios';
import type { ApiResponse, Chatroom, ChatMessage, ProjectGroup, Notification } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8014',
  timeout: 10000,
});

export const chatroomApi = {
  getAll: async (): Promise<Chatroom[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/chat-rooms');
      return response.data.data?.chat_rooms || [];
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      return [];
    }
  },
  
  create: async (data: Partial<Chatroom>): Promise<Chatroom> => {
    const response = await api.post<ApiResponse>('/api/v1/chat-rooms', data);
    return response.data.data;
  },
  
  getById: async (id: string): Promise<Chatroom> => {
    const response = await api.get<ApiResponse>(`/api/v1/chat-rooms/${id}`);
    return response.data.data;
  },
  
  update: async (id: string, data: Partial<Chatroom>): Promise<Chatroom> => {
    const response = await api.put<ApiResponse>(`/api/v1/chat-rooms/${id}`, data);
    return response.data.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/chat-rooms/${id}`);
  },
};

export const messageApi = {
  getByChatroom: async (chatroomId: string): Promise<ChatMessage[]> => {
    try {
      const response = await api.get<ApiResponse>(`/api/v1/chat-rooms/${chatroomId}/messages`);
      return response.data.data?.chat_messages || [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  },
  
  send: async (data: Partial<ChatMessage>): Promise<ChatMessage> => {
    const response = await api.post<ApiResponse>(`/api/v1/chat-rooms/${data.chatroom_id}/messages`, data);
    return response.data.data;
  },
  
  markAsRead: async (messageId: string): Promise<void> => {
    await api.put(`/api/v1/chat-messages/${messageId}/read`);
  },
  
  delete: async (messageId: string): Promise<void> => {
    await api.delete(`/api/v1/chat-messages/${messageId}`);
  },
  
  search: async (chatroomId: string, keyword: string): Promise<ChatMessage[]> => {
    try {
      const response = await api.get<ApiResponse>(`/api/v1/chat-rooms/${chatroomId}/messages/search?keyword=${keyword}`);
      return response.data.data?.messages || [];
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  },
};

export const projectGroupApi = {
  getAll: async (): Promise<ProjectGroup[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/project-groups');
      return response.data.data?.project_groups || [];
    } catch (error) {
      console.error('Failed to fetch project groups:', error);
      return [];
    }
  },
  
  create: async (data: Partial<ProjectGroup>): Promise<ProjectGroup> => {
    const response = await api.post<ApiResponse>('/api/v1/project-groups', data);
    return response.data.data;
  },
  
  update: async (id: string, data: Partial<ProjectGroup>): Promise<ProjectGroup> => {
    const response = await api.put<ApiResponse>(`/api/v1/project-groups/${id}`, data);
    return response.data.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/project-groups/${id}`);
  },
};

export const notificationApi = {
  getAll: async (userId: string = 'current-user'): Promise<Notification[]> => {
    try {
      const response = await api.get<ApiResponse>(`/api/v1/notifications/${userId}`);
      return response.data.data?.notifications || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },
  
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/api/v1/notifications/${notificationId}/read`);
  },
  
  markAllAsRead: async (userId: string = 'current-user'): Promise<void> => {
    await api.put(`/api/v1/notifications/${userId}/read-all`);
  },
};

export default api;
