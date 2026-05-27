export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface Chatroom {
  id: string;
  name: string;
  description?: string;
  room_type: 'direct' | 'group' | 'project';
  avatar?: string;
  is_private: boolean;
  max_members: number;
  member_count: number;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  chatroom_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  content: string;
  attachments?: string[];
  created_at: string;
  is_read: boolean;
}

export interface ProjectGroup {
  id: string;
  name: string;
  description?: string;
  leader_id: string;
  leader_name: string;
  member_ids: string[];
  member_count: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  status: 'online' | 'offline' | 'away';
}
