/**
 * IM · 会议通话增强 API 绑定
 *
 * 后端: IM 服务 /conferences/*
 * 路由:
 *   GET    /conferences
 *   POST   /conferences
 *   GET    /conferences/{id}
 *   PUT    /conferences/{id}
 *   DELETE /conferences/{id}
 *   POST   /conferences/{id}/start
 *   POST   /conferences/{id}/end
 *   POST   /conferences/{id}/join
 *   POST   /conferences/{id}/leave
 *   GET    /conferences/{id}/participants
 *   POST   /conferences/{id}/participants
 *   PUT    /conferences/{id}/participants/{user_id}/role
 *   DELETE /conferences/{id}/participants/{user_id}
 *   GET    /conferences/{id}/recordings
 *   POST   /conferences/{id}/recordings/start
 *   POST   /conferences/{id}/recordings/stop
 *   GET    /conferences/{id}/captions
 *   GET    /conferences/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ConferenceStatus = 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled';
export type ConferenceType = 'instant' | 'scheduled' | 'recurring' | 'live';
export type ParticipantRole = 'host' | 'co-host' | 'presenter' | 'attendee' | 'viewer';
export type RecordingFormat = 'mp4' | 'webm' | 'mp3';

export interface Conference {
  id: string;
  title: string;
  description?: string;
  conference_type: ConferenceType;
  status: ConferenceStatus;
  host_id: string;
  host_name: string;
  host_avatar?: string;
  max_participants: number;
  participant_count: number;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  is_recorded: boolean;
  recording_url?: string;
  has_captions: boolean;
  chat_enabled: boolean;
  whiteboard_enabled: boolean;
  screen_share_enabled: boolean;
  waiting_room_enabled: boolean;
  lobby_enabled: boolean;
  password_protected: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateConferenceRequest {
  title: string;
  description?: string;
  conference_type?: ConferenceType;
  max_participants?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  is_recorded?: boolean;
  has_captions?: boolean;
  chat_enabled?: boolean;
  whiteboard_enabled?: boolean;
  screen_share_enabled?: boolean;
  waiting_room_enabled?: boolean;
  password_protected?: boolean;
  participant_ids?: string[];
}

export interface ConferenceParticipant {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: ParticipantRole;
  is_online: boolean;
  is_muted: boolean;
  is_video_off: boolean;
  is_screen_sharing: boolean;
  joined_at?: string;
  left_at?: string;
  joined_duration_minutes?: number;
  hand_raised: boolean;
  reactions: Array<{ emoji: string; timestamp: string }>;
}

export interface ConferenceRecording {
  id: string;
  conference_id: string;
  conference_title: string;
  format: RecordingFormat;
  status: 'recording' | 'processing' | 'ready' | 'failed';
  file_size_bytes?: number;
  duration_minutes: number;
  started_at: string;
  ended_at: string;
  download_url?: string;
  thumbnail_url?: string;
  has_captions: boolean;
  captions_url?: string;
  transcript_url?: string;
}

export interface ConferenceCaption {
  id: string;
  conference_id: string;
  speaker_id: string;
  speaker_name: string;
  language: string;
  text: string;
  timestamp: string;
  duration_seconds: number;
}

export interface ConferenceStats {
  total_conferences: number;
  active_conferences: number;
  total_participants_today: number;
  total_duration_today_minutes: number;
  avg_duration_minutes: number;
  recordings_last_7d: number;
  most_active_hour: number;
  by_type: Array<{ type: ConferenceType; count: number }>;
  by_day: Array<{ day: string; count: number; duration_minutes: number }>;
}

export const imConferenceApi = {
  // ==================== 会议 CRUD ====================

  listConferences: async (params?: {
    status?: ConferenceStatus;
    type?: ConferenceType;
    host_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Conference>>> => {
    return apiClient.im.get('/conferences', { params });
  },

  createConference: async (data: CreateConferenceRequest): Promise<ApiResponse<Conference>> => {
    return apiClient.im.post('/conferences', data);
  },

  getConference: async (id: string): Promise<ApiResponse<Conference>> => {
    return apiClient.im.get(`/conferences/${id}`);
  },

  updateConference: async (
    id: string,
    data: Partial<
      Omit<Conference, 'id' | 'created_at' | 'updated_at' | 'participant_count' | 'status'>
    >
  ): Promise<ApiResponse<Conference>> => {
    return apiClient.im.put(`/conferences/${id}`, data);
  },

  deleteConference: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/conferences/${id}`);
  },

  // ==================== 会议控制 ====================

  startConference: async (id: string): Promise<ApiResponse<{ started: boolean }>> => {
    return apiClient.im.post(`/conferences/${id}/start`);
  },

  endConference: async (
    id: string
  ): Promise<ApiResponse<{ ended: boolean; duration_minutes: number }>> => {
    return apiClient.im.post(`/conferences/${id}/end`);
  },

  joinConference: async (
    id: string,
    data?: { password?: string; as_host?: boolean }
  ): Promise<ApiResponse<ConferenceParticipant>> => {
    return apiClient.im.post(`/conferences/${id}/join`, data || {});
  },

  leaveConference: async (id: string): Promise<ApiResponse<{ left: boolean }>> => {
    return apiClient.im.post(`/conferences/${id}/leave`);
  },

  // ==================== 参与者管理 ====================

  listConferenceParticipants: async (
    conferenceId: string,
    params?: {
      role?: ParticipantRole;
      is_online?: boolean;
    }
  ): Promise<ApiResponse<ConferenceParticipant[]>> => {
    return apiClient.im.get(`/conferences/${conferenceId}/participants`, { params });
  },

  inviteParticipant: async (
    conferenceId: string,
    data: { user_id: string; role?: ParticipantRole }
  ): Promise<ApiResponse<ConferenceParticipant>> => {
    return apiClient.im.post(`/conferences/${conferenceId}/participants`, data);
  },

  updateParticipantRole: async (
    conferenceId: string,
    userId: string,
    role: ParticipantRole
  ): Promise<ApiResponse<ConferenceParticipant>> => {
    return apiClient.im.put(`/conferences/${conferenceId}/participants/${userId}/role`, { role });
  },

  removeParticipant: async (
    conferenceId: string,
    userId: string
  ): Promise<ApiResponse<{ removed: boolean }>> => {
    return apiClient.im.delete(`/conferences/${conferenceId}/participants/${userId}`);
  },

  // ==================== 录制管理 ====================

  listConferenceRecordings: async (
    conferenceId: string,
    params?: {
      status?: ConferenceRecording['status'];
    }
  ): Promise<ApiResponse<ConferenceRecording[]>> => {
    return apiClient.im.get(`/conferences/${conferenceId}/recordings`, { params });
  },

  startRecording: async (
    conferenceId: string,
    data?: { format?: RecordingFormat }
  ): Promise<ApiResponse<ConferenceRecording>> => {
    return apiClient.im.post(`/conferences/${conferenceId}/recordings/start`, data || {});
  },

  stopRecording: async (conferenceId: string): Promise<ApiResponse<{ stopped: boolean }>> => {
    return apiClient.im.post(`/conferences/${conferenceId}/recordings/stop`);
  },

  // ==================== 实时字幕 ====================

  getConferenceCaptions: async (
    conferenceId: string,
    params?: {
      language?: string;
      from_time?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<ConferenceCaption[]>> => {
    return apiClient.im.get(`/conferences/${conferenceId}/captions`, { params });
  },

  // ==================== 统计 ====================

  getConferenceStats: async (): Promise<ApiResponse<ConferenceStats>> => {
    return apiClient.im.get('/conferences/stats');
  },
};

export default imConferenceApi;
