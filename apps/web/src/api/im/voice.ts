/**
 * IM · 语音消息与通话增强 API 绑定
 *
 * 后端: IM 服务 /voice-messages/* & /voice-calls/*
 * 路由:
 *   POST   /voice-messages/upload
 *   GET    /voice-messages/{id}
 *   GET    /voice-messages/{id}/play
 *   POST   /voice-messages/{id}/transcribe
 *   DELETE /voice-messages/{id}
 *   POST   /voice-calls/make
 *   POST   /voice-calls/{id}/answer
 *   POST   /voice-calls/{id}/hangup
 *   POST   /voice-calls/{id}/mute
 *   POST   /voice-calls/{id}/unmute
 *   POST   /voice-calls/{id}/hold
 *   POST   /voice-calls/{id}/unhold
 *   POST   /voice-calls/{id}/transfer
 *   GET    /voice-calls/{id}/status
 *   GET    /voice-calls/history
 *   POST   /voice-calls/{id}/record/start
 *   POST   /voice-calls/{id}/record/stop
 *   GET    /voice-calls/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type VoiceMessageStatus = 'uploading' | 'ready' | 'transcribing' | 'processed' | 'failed';
export type VoiceCallStatus = 'ringing' | 'active' | 'on_hold' | 'ended' | 'missed' | 'rejected';
export type VoiceCallDirection = 'outgoing' | 'incoming';
export type VoiceCallQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface VoiceMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  chat_id: string;
  duration_seconds: number;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  waveform_data?: number[];
  transcript?: string;
  transcript_language?: string;
  is_transcribed: boolean;
  status: VoiceMessageStatus;
  created_at: string;
}

export interface CreateVoiceMessageRequest {
  chat_id: string;
  duration_seconds: number;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  waveform_data?: number[];
  auto_transcribe?: boolean;
  language?: string;
}

export interface TranscribeVoiceMessageRequest {
  language?: string;
  model?: 'base' | 'enhanced';
}

export interface VoiceCall {
  id: string;
  caller_id: string;
  caller_name: string;
  caller_avatar?: string;
  receiver_id: string;
  receiver_name: string;
  receiver_avatar?: string;
  direction: VoiceCallDirection;
  status: VoiceCallStatus;
  quality?: VoiceCallQuality;
  is_muted: boolean;
  is_held: boolean;
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  has_recording: boolean;
  error_message?: string;
}

export interface MakeVoiceCallRequest {
  receiver_id: string;
  auto_answer?: boolean;
  record_call?: boolean;
  caller_id?: string;
}

export interface TransferVoiceCallRequest {
  target_user_id: string;
  target_user_name?: string;
  reason?: string;
}

export interface VoiceCallHistoryRecord {
  id: string;
  voice_call_id: string;
  direction: VoiceCallDirection;
  status: VoiceCallStatus;
  peer_id: string;
  peer_name: string;
  peer_avatar?: string;
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  quality?: VoiceCallQuality;
  recording_url?: string;
}

export interface VoiceStats {
  total_voice_messages_today: number;
  total_voice_duration_today_seconds: number;
  avg_voice_message_duration_seconds: number;
  total_voice_calls_today: number;
  total_voice_call_duration_today_seconds: number;
  missed_calls_today: number;
  by_hour: Array<{ hour: number; messages: number; calls: number }>;
}

export const imVoiceApi = {
  // ==================== 语音消息 ====================

  uploadVoiceMessage: async (
    data: CreateVoiceMessageRequest
  ): Promise<ApiResponse<VoiceMessage>> => {
    return apiClient.im.post('/voice-messages/upload', data);
  },

  getVoiceMessage: async (id: string): Promise<ApiResponse<VoiceMessage>> => {
    return apiClient.im.get(`/voice-messages/${id}`);
  },

  getVoiceMessagePlayUrl: async (
    id: string
  ): Promise<ApiResponse<{ play_url: string; expires_at: string }>> => {
    return apiClient.im.get(`/voice-messages/${id}/play`);
  },

  transcribeVoiceMessage: async (
    id: string,
    data?: TranscribeVoiceMessageRequest
  ): Promise<ApiResponse<VoiceMessage>> => {
    return apiClient.im.post(`/voice-messages/${id}/transcribe`, data || {});
  },

  deleteVoiceMessage: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/voice-messages/${id}`);
  },

  // ==================== 语音通话 ====================

  makeVoiceCall: async (data: MakeVoiceCallRequest): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post('/voice-calls/make', data);
  },

  answerVoiceCall: async (
    id: string,
    data?: { auto_mute?: boolean; video_enabled?: boolean }
  ): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/answer`, data || {});
  },

  hangupVoiceCall: async (
    id: string
  ): Promise<ApiResponse<{ ended: boolean; duration_seconds: number }>> => {
    return apiClient.im.post(`/voice-calls/${id}/hangup`);
  },

  muteVoiceCall: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/mute`);
  },

  unmuteVoiceCall: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/unmute`);
  },

  holdVoiceCall: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/hold`);
  },

  unholdVoiceCall: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/unhold`);
  },

  transferVoiceCall: async (
    id: string,
    data: TransferVoiceCallRequest
  ): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/transfer`, data);
  },

  getVoiceCallStatus: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.get(`/voice-calls/${id}/status`);
  },

  // ==================== 通话历史与录音 ====================

  listVoiceCallHistory: async (params?: {
    direction?: VoiceCallDirection;
    status?: VoiceCallStatus;
    from_date?: string;
    to_date?: string;
    peer_id?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<VoiceCallHistoryRecord>>> => {
    return apiClient.im.get('/voice-calls/history', { params });
  },

  startVoiceCallRecording: async (
    id: string,
    data?: { format?: 'mp3' | 'wav' }
  ): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/record/start`, data || {});
  },

  stopVoiceCallRecording: async (id: string): Promise<ApiResponse<VoiceCall>> => {
    return apiClient.im.post(`/voice-calls/${id}/record/stop`);
  },

  // ==================== 统计 ====================

  getVoiceStats: async (): Promise<ApiResponse<VoiceStats>> => {
    return apiClient.im.get('/voice-calls/stats');
  },
};

export default imVoiceApi;
