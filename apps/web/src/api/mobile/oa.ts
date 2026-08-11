/**
 * Mobile · 移动端 OA 办公协同 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 OA/Meeting/Calendar 服务客户端)
 * 路由:
 *   GET    /mobile/meetings
 *   GET    /mobile/meetings/{id}
 *   POST   /mobile/meetings
 *   PUT    /mobile/meetings/{id}
 *   DELETE /mobile/meetings/{id}
 *   POST   /mobile/meetings/{id}/join
 *   POST   /mobile/meetings/{id}/leave
 *   GET    /mobile/calendar/events
 *   POST   /mobile/calendar/events
 *   PUT    /mobile/calendar/events/{id}
 *   DELETE /mobile/calendar/events/{id}
 *   GET    /mobile/tasks
 *   GET    /mobile/tasks/{id}
 *   POST   /mobile/tasks
 *   PUT    /mobile/tasks/{id}
 *   DELETE /mobile/tasks/{id}
 *   POST   /mobile/tasks/{id}/complete
 *   GET    /mobile/announcements
 *   GET    /mobile/announcements/{id}
 *   POST   /mobile/announcements/{id}/read
 *   GET    /mobile/oa/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type OaMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type OaMeetingType = 'internal' | 'external' | 'recurring';
export type OaCalendarEventType = 'meeting' | 'task' | 'reminder' | 'holiday' | 'personal';
export type OaTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type OaTaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type OaAnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  type: OaMeetingType;
  status: OaMeetingStatus;
  start_time: string;
  end_time: string;
  location?: string;
  video_url?: string;
  organizer: string;
  organizer_name?: string;
  attendees: MeetingAttendee[];
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  user_id: string;
  user_name?: string;
  role: 'organizer' | 'host' | 'guest';
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  joined_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: OaCalendarEventType;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  is_reminder: boolean;
  reminder_minutes?: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface OaTask {
  id: string;
  title: string;
  description?: string;
  priority: OaTaskPriority;
  status: OaTaskStatus;
  assignee?: string;
  assignee_name?: string;
  creator: string;
  creator_name?: string;
  due_date?: string;
  completed_at?: string;
  tags?: string[];
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OaAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: OaAnnouncementPriority;
  author: string;
  author_name?: string;
  is_read: boolean;
  published_at: string;
}

export interface OaStats {
  total_meetings_today: number;
  upcoming_meetings: number;
  meetings_this_week: number;
  pending_tasks: number;
  completed_tasks_today: number;
  unread_announcements: number;
  calendar_events_today: number;
  by_priority: Array<{
    priority: OaTaskPriority;
    count: number;
  }>;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  type: OaMeetingType;
  start_time: string;
  end_time: string;
  location?: string;
  video_url?: string;
  attendee_ids?: string[];
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  type: OaCalendarEventType;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  is_reminder?: boolean;
  reminder_minutes?: number;
  color?: string;
}

export interface CreateOaTaskRequest {
  title: string;
  description?: string;
  priority?: OaTaskPriority;
  assignee?: string;
  due_date?: string;
  tags?: string[];
  project_id?: string;
}

export const oaApi = {
  // ==================== 会议管理 ====================

  listMeetings: async (params?: {
    status?: OaMeetingStatus;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Meeting>>> => {
    return apiClient.mobile.get('/mobile/meetings', { params });
  },

  getMeeting: async (id: string): Promise<ApiResponse<Meeting>> => {
    return apiClient.mobile.get(`/mobile/meetings/${id}`);
  },

  createMeeting: async (data: CreateMeetingRequest): Promise<ApiResponse<Meeting>> => {
    return apiClient.mobile.post('/mobile/meetings', data);
  },

  updateMeeting: async (
    id: string,
    data: Partial<CreateMeetingRequest>
  ): Promise<ApiResponse<Meeting>> => {
    return apiClient.mobile.put(`/mobile/meetings/${id}`, data);
  },

  deleteMeeting: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/meetings/${id}`);
  },

  joinMeeting: async (id: string): Promise<ApiResponse<Meeting>> => {
    return apiClient.mobile.post(`/mobile/meetings/${id}/join`);
  },

  leaveMeeting: async (id: string): Promise<ApiResponse<Meeting>> => {
    return apiClient.mobile.post(`/mobile/meetings/${id}/leave`);
  },

  // ==================== 日历事件 ====================

  listCalendarEvents: async (params?: {
    start_date?: string;
    end_date?: string;
    type?: OaCalendarEventType;
  }): Promise<ApiResponse<CalendarEvent[]>> => {
    return apiClient.mobile.get('/mobile/calendar/events', { params });
  },

  createCalendarEvent: async (
    data: CreateCalendarEventRequest
  ): Promise<ApiResponse<CalendarEvent>> => {
    return apiClient.mobile.post('/mobile/calendar/events', data);
  },

  updateCalendarEvent: async (
    id: string,
    data: Partial<CreateCalendarEventRequest>
  ): Promise<ApiResponse<CalendarEvent>> => {
    return apiClient.mobile.put(`/mobile/calendar/events/${id}`, data);
  },

  deleteCalendarEvent: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/calendar/events/${id}`);
  },

  // ==================== 任务协作 ====================

  listTasks: async (params?: {
    status?: OaTaskStatus;
    priority?: OaTaskPriority;
    assignee?: string;
    project_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<OaTask>>> => {
    return apiClient.mobile.get('/mobile/tasks', { params });
  },

  getTask: async (id: string): Promise<ApiResponse<OaTask>> => {
    return apiClient.mobile.get(`/mobile/tasks/${id}`);
  },

  createTask: async (data: CreateOaTaskRequest): Promise<ApiResponse<OaTask>> => {
    return apiClient.mobile.post('/mobile/tasks', data);
  },

  updateTask: async (
    id: string,
    data: Partial<CreateOaTaskRequest & { status?: OaTaskStatus }>
  ): Promise<ApiResponse<OaTask>> => {
    return apiClient.mobile.put(`/mobile/tasks/${id}`, data);
  },

  deleteTask: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/tasks/${id}`);
  },

  completeTask: async (id: string): Promise<ApiResponse<OaTask>> => {
    return apiClient.mobile.post(`/mobile/tasks/${id}/complete`);
  },

  // ==================== 公告通知 ====================

  listAnnouncements: async (params?: {
    priority?: OaAnnouncementPriority;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<OaAnnouncement>>> => {
    return apiClient.mobile.get('/mobile/announcements', { params });
  },

  getAnnouncement: async (id: string): Promise<ApiResponse<OaAnnouncement>> => {
    return apiClient.mobile.get(`/mobile/announcements/${id}`);
  },

  markAnnouncementRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.post(`/mobile/announcements/${id}/read`);
  },

  // ==================== OA 统计 ====================

  getOaStats: async (): Promise<ApiResponse<OaStats>> => {
    return apiClient.mobile.get('/mobile/oa/stats');
  },
};

export default oaApi;
