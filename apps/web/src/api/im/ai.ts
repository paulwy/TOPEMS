/**
 * IM · AI 智能助手 API 绑定
 *
 * 后端: IM 服务 /ai/*
 * 路由:
 *   POST   /ai/translate
 *   POST   /ai/detect-language
 *   POST   /ai/summarize
 *   POST   /ai/reply-suggest
 *   POST   /ai/grammar-check
 *   POST   /ai/sentiment
 *   POST   /ai/rewrite
 *   POST   /ai/batch-translate
 *   GET    /ai/models
 *   GET    /ai/config
 *   PUT    /ai/config
 *   GET    /ai/usage
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AiTaskType = 'translate' | 'summarize' | 'reply' | 'grammar' | 'sentiment' | 'rewrite';
export type AiModelType = 'gpt-4o' | 'gpt-4o-mini' | 'deepseek-chat' | 'qwen-max';
export type AiTone = 'professional' | 'casual' | 'friendly' | 'formal';
export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface TranslationResult {
  source_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence_score: number;
  model_used: string;
  tokens_used: number;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
  total_tokens: number;
  total_time_ms: number;
}

export interface DetectLanguageResult {
  language: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
}

export interface SummarizationResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  estimated_reading_time_minutes: number;
  model_used: string;
}

export interface ReplySuggestionResult {
  suggestions: Array<{
    text: string;
    intent: 'question' | 'agreement' | 'disagreement' | 'acknowledgment' | 'request_more';
    confidence: number;
    tone: AiTone;
  }>;
  best_match_index: number;
}

export interface GrammarCheckResult {
  is_correct: boolean;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
    rule_type: 'spelling' | 'grammar' | 'style' | 'punctuation';
    position?: { start: number; end: number };
  }>;
  score: number;
}

export interface SentimentResult {
  sentiment: SentimentType;
  score: number;
  emotions: Record<string, number>;
  key_phrases: string[];
  language: string;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  changes: Array<{ type: string; description: string }>;
  readability_score: number;
  model_used: string;
}

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  capabilities: AiTaskType[];
  is_active: boolean;
  supports_streaming: boolean;
  max_context_tokens: number;
  cost_per_1k_tokens?: number;
}

export interface AiConfig {
  default_model: AiModelType;
  default_source_language: string;
  default_target_language: string;
  auto_translate_enabled: boolean;
  auto_summarize_enabled: boolean;
  auto_reply_suggestions_enabled: boolean;
  max_daily_requests: number;
  rate_limit_per_minute: number;
  stream_response_enabled: boolean;
}

export interface AiUsage {
  total_requests_today: number;
  total_tokens_today: number;
  requests_by_type: Record<AiTaskType, number>;
  requests_by_model: Record<string, number>;
  avg_latency_ms: number;
  daily_limit_remaining: number;
}

export const imAiApi = {
  // ==================== 翻译 ====================

  translate: async (data: {
    text: string;
    target_language: string;
    source_language?: string;
    model?: AiModelType;
    preserve_formatting?: boolean;
  }): Promise<ApiResponse<TranslationResult>> => {
    return apiClient.im.post('/ai/translate', data);
  },

  batchTranslate: async (data: {
    texts: Array<{ text: string; source_language?: string }>;
    target_language: string;
    model?: AiModelType;
  }): Promise<ApiResponse<BatchTranslationResult>> => {
    return apiClient.im.post('/ai/batch-translate', data);
  },

  detectLanguage: async (text: string): Promise<ApiResponse<DetectLanguageResult>> => {
    return apiClient.im.post('/ai/detect-language', { text });
  },

  // ==================== 文本处理 ====================

  summarize: async (data: {
    text: string;
    max_length?: number;
    focus_areas?: string[];
    model?: AiModelType;
  }): Promise<ApiResponse<SummarizationResult>> => {
    return apiClient.im.post('/ai/summarize', data);
  },

  checkGrammar: async (
    text: string,
    language?: string
  ): Promise<ApiResponse<GrammarCheckResult>> => {
    return apiClient.im.post('/ai/grammar-check', { text, language });
  },

  analyzeSentiment: async (text: string): Promise<ApiResponse<SentimentResult>> => {
    return apiClient.im.post('/ai/sentiment', { text });
  },

  rewrite: async (data: {
    text: string;
    target_tone?: AiTone;
    target_length?: 'shorter' | 'similar' | 'longer';
    language?: string;
  }): Promise<ApiResponse<RewriteResult>> => {
    return apiClient.im.post('/ai/rewrite', data);
  },

  // ==================== 智能回复 ====================

  suggestReply: async (data: {
    context: string;
    last_messages?: Array<{ sender_id: string; text: string; timestamp: string }>;
    num_suggestions?: number;
    preferred_tone?: AiTone;
  }): Promise<ApiResponse<ReplySuggestionResult>> => {
    return apiClient.im.post('/ai/reply-suggest', data);
  },

  // ==================== 模型与配置 ====================

  listAiModels: async (): Promise<ApiResponse<AiModel[]>> => {
    return apiClient.im.get('/ai/models');
  },

  getAiConfig: async (): Promise<ApiResponse<AiConfig>> => {
    return apiClient.im.get('/ai/config');
  },

  updateAiConfig: async (data: Partial<AiConfig>): Promise<ApiResponse<AiConfig>> => {
    return apiClient.im.put('/ai/config', data);
  },

  // ==================== 使用统计 ====================

  getAiUsage: async (): Promise<ApiResponse<AiUsage>> => {
    return apiClient.im.get('/ai/usage');
  },
};

export default imAiApi;
