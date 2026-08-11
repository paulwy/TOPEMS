/**
 * Mobile · 移动端 AI 智能助手 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 AI/Assistant 服务客户端)
 * 路由:
 *   POST   /mobile/ai/chat
 *   GET    /mobile/ai/conversations
 *   GET    /mobile/ai/conversations/{id}
 *   DELETE /mobile/ai/conversations/{id}
 *   POST   /mobile/ai/conversations/{id}/stream
 *   POST   /mobile/ai/voice/transcribe
 *   POST   /mobile/ai/voice/synthesize
 *   GET    /mobile/ai/recommendations
 *   POST   /mobile/ai/recommendations/feedback
 *   GET    /mobile/ai/commands
 *   POST   /mobile/ai/execute
 *   GET    /mobile/ai/quick-actions
 *   POST   /mobile/ai/images/generate
 *   GET    /mobile/ai/models
 *   GET    /mobile/ai/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type AiMessageRole = 'user' | 'assistant' | 'system';
export type AiConversationStatus = 'active' | 'archived' | 'deleted';
export type AiCommandStatus = 'enabled' | 'disabled';
export type AiFeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'other';

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  timestamp: string;
  model?: string;
  tokens_used?: number;
  attachments?: AiAttachment[];
}

export interface AiAttachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'code';
  url: string;
  name?: string;
  size?: number;
}

export interface AiConversation {
  id: string;
  title: string;
  status: AiConversationStatus;
  message_count: number;
  last_message?: AiMessage;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AiRecommendation {
  id: string;
  type: 'action' | 'content' | 'feature';
  title: string;
  description?: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

export interface AiCommand {
  id: string;
  name: string;
  description: string;
  trigger: string;
  category: string;
  status: AiCommandStatus;
  params_schema?: Record<string, unknown>;
  usage_count?: number;
}

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  max_tokens: number;
  is_default: boolean;
}

export interface AiStats {
  total_conversations: number;
  active_conversations: number;
  total_messages_today: number;
  avg_response_time_ms: number;
  popular_commands: Array<{
    name: string;
    usage_count: number;
  }>;
  top_models: Array<{
    name: string;
    usage_count: number;
  }>;
  feedback_stats: {
    helpful: number;
    not_helpful: number;
    incorrect: number;
  };
}

export interface SendMessageRequest {
  content: string;
  conversation_id?: string;
  model?: string;
  attachments?: Array<{
    type: AiAttachment['type'];
    url: string;
    name?: string;
  }>;
  context?: Record<string, unknown>;
}

export interface TranscribeRequest {
  audio_url: string;
  language?: string;
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface ExecuteCommandRequest {
  command_id: string;
  params?: Record<string, unknown>;
}

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  size?: 'small' | 'medium' | 'large';
  style?: string;
}

export const aiAssistantApi = {
  // ==================== 对话管理 ====================

  sendMessage: async (data: SendMessageRequest): Promise<ApiResponse<AiMessage>> => {
    return apiClient.mobile.post('/mobile/ai/chat', data);
  },

  listConversations: async (params?: {
    status?: AiConversationStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<AiConversation>>> => {
    return apiClient.mobile.get('/mobile/ai/conversations', { params });
  },

  getConversation: async (id: string): Promise<ApiResponse<AiConversation>> => {
    return apiClient.mobile.get(`/mobile/ai/conversations/${id}`);
  },

  deleteConversation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/mobile/ai/conversations/${id}`);
  },

  streamConversation: async (
    id: string,
    data: { content: string }
  ): Promise<ApiResponse<ReadableStream>> => {
    return apiClient.mobile.post(`/mobile/ai/conversations/${id}/stream`, data, {
      responseType: 'stream',
    });
  },

  // ==================== 语音交互 ====================

  transcribeAudio: async (data: TranscribeRequest): Promise<ApiResponse<{ text: string }>> => {
    return apiClient.mobile.post('/mobile/ai/voice/transcribe', data);
  },

  synthesizeSpeech: async (
    data: SynthesizeRequest
  ): Promise<ApiResponse<{ audio_url: string }>> => {
    return apiClient.mobile.post('/mobile/ai/voice/synthesize', data);
  },

  // ==================== 智能推荐 ====================

  getRecommendations: async (params?: {
    context?: string;
    limit?: number;
  }): Promise<ApiResponse<AiRecommendation[]>> => {
    return apiClient.mobile.get('/mobile/ai/recommendations', { params });
  },

  submitRecommendationFeedback: async (
    id: string,
    data: { type: AiFeedbackType; comment?: string }
  ): Promise<ApiResponse<void>> => {
    return apiClient.mobile.post(`/mobile/ai/recommendations/feedback/${id}`, data);
  },

  // ==================== 智能命令 ====================

  listCommands: async (params?: {
    category?: string;
    status?: AiCommandStatus;
  }): Promise<ApiResponse<AiCommand[]>> => {
    return apiClient.mobile.get('/mobile/ai/commands', { params });
  },

  executeCommand: async (
    data: ExecuteCommandRequest
  ): Promise<ApiResponse<{ result: unknown }>> => {
    return apiClient.mobile.post('/mobile/ai/execute', data);
  },

  listQuickActions: async (): Promise<ApiResponse<AiRecommendation[]>> => {
    return apiClient.mobile.get('/mobile/ai/quick-actions');
  },

  // ==================== AI 图像生成 ====================

  generateImage: async (
    data: GenerateImageRequest
  ): Promise<ApiResponse<{ image_url: string }>> => {
    return apiClient.mobile.post('/mobile/ai/images/generate', data);
  },

  // ==================== 模型管理与统计 ====================

  listModels: async (): Promise<ApiResponse<AiModel[]>> => {
    return apiClient.mobile.get('/mobile/ai/models');
  },

  getAiStats: async (): Promise<ApiResponse<AiStats>> => {
    return apiClient.mobile.get('/mobile/ai/stats');
  },
};

export default aiAssistantApi;
