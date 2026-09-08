/**
 * IM · 语音/视频通话 API 绑定
 *
 * 后端: IM 服务 /calls/*
 * 路由:
 *   POST   /calls/initiate
 *   GET    /calls/{id}
 *   POST   /calls/{id}/answer
 *   POST   /calls/{id}/decline
 *   POST   /calls/{id}/hangup
 *   POST   /calls/{id}/transfer
 *   POST   /calls/{id}/mute
 *   POST   /calls/{id}/unmute
 *   POST   /calls/{id}/toggle-video
 *   GET    /calls/{id}/participants
 *   POST   /calls/{id}/invite
 *   DELETE /calls/{id}/participants/{user_id}
 *   GET    /calls/active
 *   GET    /calls/history
 *   GET    /calls/history/{id}
 *   POST   /calls/conference
 *   GET    /calls/conference/{id}
 *   POST   /calls/conference/{id}/join
 *   POST   /calls/conference/{id}/leave
 *   POST   /calls/{id}/recording/start
 *   POST   /calls/{id}/recording/stop
 *   GET    /calls/{id}/recording
 *   GET    /calls/stats
 *   PUT    /calls/{id}/dtmf
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type CallType = 'voice' | 'video';
export type CallDirection = 'outgoing' | 'incoming';
export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connected'
  | 'on_hold'
  | 'transferred'
  | 'ended'
  | 'missed'
  | 'declined'
  | 'timed_out';

export type ParticipantRole = 'caller' | 'callee' | 'conference_host' | 'participant';

export interface CallSession {
  id: string;
  call_type: CallType;
  direction: CallDirection;
  status: CallStatus;
  initiator_id: string;
  initiator_name: string;
  initiator_avatar?: string;
  recipient_id?: string;
  recipient_name?: string;
  recipient_avatar?: string;
  room_id?: string;
  participants: CallParticipant[];
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  is_muted: boolean;
  is_video_on: boolean;
  is_recording: boolean;
  transfer_from?: string;
  transfer_to?: string;
  created_at: string;
  updated_at: string;
}

export interface CallParticipant {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: ParticipantRole;
  has_joined: boolean;
  is_muted: boolean;
  is_video_on: boolean;
  is_speaking: boolean;
  joined_at?: string;
  left_at?: string;
  signal_state?: 'idle' | 'connecting' | 'connected' | 'failed';
}

export interface InitiateCallRequest {
  call_type: CallType;
  recipient_id?: string;
  room_id?: string;
  message?: string;
}

export interface AnswerCallRequest {
  accept: boolean;
  mute?: boolean;
  video?: boolean;
}

export interface ConferenceCallRequest {
  call_type: CallType;
  title?: string;
  participant_ids: string[];
  room_id?: string;
  description?: string;
}

export interface CallRecording {
  id: string;
  call_id: string;
  url: string;
  duration_seconds: number;
  size_bytes: number;
  format: string;
  started_at: string;
  stopped_at?: string;
  created_at: string;
}

export interface CallHistoryRecord {
  id: string;
  call_type: CallType;
  direction: CallDirection;
  status: CallStatus;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  started_at: string;
  duration_seconds: number;
  is_missed: boolean;
  is_recording_available: boolean;
}

export interface CallStats {
  total_calls: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  missed_calls: number;
  outgoing_calls: number;
  incoming_calls: number;
  by_type: { voice: number; video: number };
  by_day: Array<{ date: string; count: number; duration: number }>;
  top_contacts: Array<{ user_id: string; user_name: string; count: number; duration: number }>;
}

export const imCallApi = {
  // ==================== 通话发起与会话 ====================

  initiateCall: async (data: InitiateCallRequest): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post('/calls/initiate', data);
  },

  getCall: async (id: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.get(`/calls/${id}`);
  },

  answerCall: async (
    callId: string,
    data: AnswerCallRequest
  ): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/answer`, data);
  },

  declineCall: async (callId: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/decline`);
  },

  hangupCall: async (
    callId: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/hangup`, data || {});
  },

  // ==================== 通话控制 ====================

  muteCall: async (
    callId: string,
    data?: { mute?: boolean }
  ): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/mute`, data || {});
  },

  unmuteCall: async (callId: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/unmute`);
  },

  toggleVideo: async (callId: string, data: { on: boolean }): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/toggle-video`, data);
  },

  putOnHold: async (callId: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/hold`);
  },

  resumeFromHold: async (callId: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/resume`);
  },

  transferCall: async (
    callId: string,
    data: { target_user_id: string; target_name?: string; message?: string }
  ): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/${callId}/transfer`, data);
  },

  sendDTMF: async (
    callId: string,
    data: { digits: string }
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.im.put(`/calls/${callId}/dtmf`, data);
  },

  // ==================== 参与者管理 ====================

  listParticipants: async (callId: string): Promise<ApiResponse<CallParticipant[]>> => {
    return apiClient.im.get(`/calls/${callId}/participants`);
  },

  inviteParticipant: async (
    callId: string,
    data: { user_id: string; user_name?: string }
  ): Promise<ApiResponse<CallParticipant>> => {
    return apiClient.im.post(`/calls/${callId}/invite`, data);
  },

  removeParticipant: async (callId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/calls/${callId}/participants/${userId}`);
  },

  // ==================== 会议通话 ====================

  createConference: async (data: ConferenceCallRequest): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post('/calls/conference', data);
  },

  getConference: async (conferenceId: string): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.get(`/calls/conference/${conferenceId}`);
  },

  joinConference: async (
    conferenceId: string,
    data?: { mute?: boolean; video?: boolean }
  ): Promise<ApiResponse<CallSession>> => {
    return apiClient.im.post(`/calls/conference/${conferenceId}/join`, data || {});
  },

  leaveConference: async (conferenceId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.post(`/calls/conference/${conferenceId}/leave`);
  },

  // ==================== 活跃会话查询 ====================

  getActiveCall: async (): Promise<ApiResponse<CallSession | null>> => {
    return apiClient.im.get('/calls/active');
  },

  // ==================== 通话记录 ====================

  listCallHistory: async (params?: {
    direction?: CallDirection;
    call_type?: CallType;
    status?: CallStatus;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<CallHistoryRecord>>> => {
    return apiClient.im.get('/calls/history', { params });
  },

  getCallHistoryDetail: async (id: string): Promise<ApiResponse<CallHistoryRecord>> => {
    return apiClient.im.get(`/calls/history/${id}`);
  },

  // ==================== 录音管理 ====================

  startRecording: async (
    callId: string,
    data?: { format?: 'webm' | 'mp4' }
  ): Promise<ApiResponse<CallRecording>> => {
    return apiClient.im.post(`/calls/${callId}/recording/start`, data || {});
  },

  stopRecording: async (callId: string): Promise<ApiResponse<CallRecording>> => {
    return apiClient.im.post(`/calls/${callId}/recording/stop`);
  },

  getRecording: async (callId: string): Promise<ApiResponse<CallRecording | null>> => {
    return apiClient.im.get(`/calls/${callId}/recording`);
  },

  // ==================== 统计 ====================

  getCallStats: async (params?: {
    period?: 'day' | 'week' | 'month' | 'quarter';
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<CallStats>> => {
    return apiClient.im.get('/calls/stats', { params });
  },
};

export default imCallApi;
