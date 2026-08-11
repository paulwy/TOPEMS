/**
 * IM · 会话内 AI 助手 API 绑定
 *
 * 后端: IM 服务 /assistant/*
 * 路由:
 *   POST   /assistant/summarize
 *   POST   /assistant/action-items
 *   POST   /assistant/suggest-reply
 *   POST   /assistant/sentiment
 *   GET    /assistant/insights/:chatId
 *   GET    /assistant/config
 *   PUT    /assistant/config
 *   GET    /assistant/conversations
 *   GET    /assistant/tasks
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AssistantTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AssistantConfigStatus = 'enabled' | 'disabled';

export interface ConversationSummary {
  chat_id: string;
  summary: string;
  key_points: string[];
  participant_count: number;
  message_count: number;
  time_range: {
    start: string;
    end: string;
  };
  model_used: string;
}

export interface ActionItem {
  id: string;
  content: string;
  source_message_id: string;
  extracted_by: 'ai';
  confidence: number;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  assigned_to?: string;
}

export interface ReplySuggestion {
  id: string;
  suggestions: Array<{
    text: string;
    type: 'answer' | 'question' | 'acknowledgment' | 'action';
    confidence: number;
    tone: 'professional' | 'casual' | 'friendly';
  }>;
  context_window: number;
}

export interface ConversationSentiment {
  chat_id: string;
  overall_sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  emotion_distribution: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ConversationInsights {
  chat_id: string;
  active_topics: Array<{ topic: string; message_count: number }>;
  participant_activity: Array<{
    user_id: string;
    message_count: number;
    avg_response_time_ms: number;
  }>;
  peak_activity_hours: number[];
  unanswered_questions: string[];
  suggested_actions: string[];
}

export interface AssistantConfig {
  id: string;
  auto_summarize: boolean;
  auto_summarize_threshold: number;
  smart_replies_enabled: boolean;
  action_item_detection: boolean;
  sentiment_monitoring: boolean;
  insights_enabled: boolean;
  preferred_language: string;
  tone: 'professional' | 'casual' | 'friendly';
}

export interface AssistantTask {
  id: string;
  type: 'summarize' | 'extract_actions' | 'suggest_reply' | 'sentiment' | 'insights';
  status: AssistantTaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  created_by: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SummarizeConversationRequest {
  chat_id: string;
  message_ids?: string[];
  time_range?: { start: string; end: string };
  max_length?: number;
}

export interface ExtractActionItemsRequest {
  chat_id: string;
  message_ids?: string[];
  time_range?: { start: string; end: string };
  auto_assign?: boolean;
}

export interface SuggestReplyRequest {
  chat_id: string;
  message_id: string;
  context_message_count?: number;
  num_suggestions?: number;
}

export interface AnalyzeSentimentRequest {
  chat_id: string;
  message_ids?: string[];
  time_range?: { start: string; end: string };
}

export interface UpdateAssistantConfigRequest {
  auto_summarize?: boolean;
  auto_summarize_threshold?: number;
  smart_replies_enabled?: boolean;
  action_item_detection?: boolean;
  sentiment_monitoring?: boolean;
  insights_enabled?: boolean;
  preferred_language?: string;
  tone?: 'professional' | 'casual' | 'friendly';
}

export const imAssistantApi = {
  summarizeConversation: async (
    data: SummarizeConversationRequest
  ): Promise<ApiResponse<ConversationSummary>> => {
    return apiClient.im.post('/assistant/summarize', data);
  },

  extractActionItems: async (
    data: ExtractActionItemsRequest
  ): Promise<ApiResponse<ActionItem[]>> => {
    return apiClient.im.post('/assistant/action-items', data);
  },

  suggestReply: async (data: SuggestReplyRequest): Promise<ApiResponse<ReplySuggestion>> => {
    return apiClient.im.post('/assistant/suggest-reply', data);
  },

  analyzeConversationSentiment: async (
    data: AnalyzeSentimentRequest
  ): Promise<ApiResponse<ConversationSentiment>> => {
    return apiClient.im.post('/assistant/sentiment', data);
  },

  getConversationInsights: async (chatId: string): Promise<ApiResponse<ConversationInsights>> => {
    return apiClient.im.get(`/assistant/insights/${chatId}`);
  },

  getAssistantConfig: async (): Promise<ApiResponse<AssistantConfig>> => {
    return apiClient.im.get('/assistant/config');
  },

  updateAssistantConfig: async (
    data: UpdateAssistantConfigRequest
  ): Promise<ApiResponse<AssistantConfig>> => {
    return apiClient.im.put('/assistant/config', data);
  },

  getAssistantConversations: async (params?: {
    status?: AssistantConfigStatus;
  }): Promise<ApiResponse<AssistantTask[]>> => {
    return apiClient.im.get('/assistant/conversations', { params });
  },

  getAssistantTasks: async (params?: {
    status?: AssistantTaskStatus;
    type?: string;
  }): Promise<ApiResponse<AssistantTask[]>> => {
    return apiClient.im.get('/assistant/tasks', { params });
  },
};
