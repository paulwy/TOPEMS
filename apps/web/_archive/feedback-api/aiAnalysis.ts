/**
 * Feedback · AI 智能分析 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   POST   /feedback/ai/sentiment
 *   POST   /feedback/ai/classify
 *   POST   /feedback/ai/predict-priority
 *   POST   /feedback/ai/find-similar
 *   POST   /feedback/ai/generate-response
 *   POST   /feedback/ai/extract-issues
 *   GET    /feedback/ai/trend-prediction
 *   POST   /feedback/ai/batch-analyze
 *   GET    /feedback/ai/models
 *   POST   /feedback/ai/models
 *   GET    /feedback/ai/models/{id}
 *   PUT    /feedback/ai/models/{id}
 *   DELETE /feedback/ai/models/{id}
 *   POST   /feedback/ai/models/{id}/test
 *   GET    /feedback/ai/analysis-history
 *   GET    /feedback/ai/analysis-stats
 *   POST   /feedback/ai/feedback-learning
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type SentimentType = 'positive' | 'negative' | 'neutral';
export type FeedbackCategory =
  'bug' | 'feature_request' | 'improvement' | 'question' | 'complaint' | 'praise';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type AiModelType =
  | 'sentiment'
  | 'classification'
  | 'priority'
  | 'similarity'
  | 'response_generation'
  | 'trend_prediction';
export type ModelStatus = 'draft' | 'training' | 'active' | 'inactive' | 'failed';

export interface SentimentResult {
  sentiment: SentimentType;
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions: Array<{
    name: string;
    score: number;
  }>;
}

export interface ClassificationResult {
  category: FeedbackCategory;
  confidence: number;
  sub_category?: string;
  suggested_tags: string[];
  alternatives: Array<{
    category: FeedbackCategory;
    confidence: number;
  }>;
}

export interface PriorityPrediction {
  priority: PriorityLevel;
  confidence: number;
  factors: Array<{
    name: string;
    weight: number;
    description: string;
  }>;
  estimated_resolution_hours?: number;
  sla_compliance_probability?: number;
}

export interface SimilarFeedback {
  id: string;
  title: string;
  status: string;
  similarity_score: number;
  category?: string;
  created_at: string;
}

export interface GeneratedResponse {
  response_type: 'acknowledgment' | 'update' | 'solution';
  content: string;
  confidence: number;
  alternatives: Array<{
    content: string;
    tone: 'formal' | 'friendly' | 'technical';
  }>;
  suggested_actions: string[];
}

export interface ExtractedIssue {
  id: string;
  title: string;
  type: 'bug' | 'feature_gap' | 'ux_issue' | 'performance' | 'security';
  severity: PriorityLevel;
  confidence: number;
  occurrences: number;
  affected_areas: string[];
  related_feedbacks: string[];
  suggested_fix?: string;
}

export interface TrendPrediction {
  predicted_period: string;
  predicted_volume: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_magnitude: number;
  by_category: Array<{
    category: string;
    predicted_change: number;
  }>;
  alerts: Array<{
    type: 'spike' | 'drop' | 'anomaly';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface AiModel {
  id: string;
  tenant_id: string;
  name: string;
  model_type: AiModelType;
  status: ModelStatus;
  version: string;
  description?: string;
  accuracy?: number;
  last_trained_at?: string;
  training_data_size?: number;
  is_default: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnalysisHistory {
  id: string;
  feedback_id?: string;
  model_id: string;
  model_name: string;
  analysis_type: AiModelType;
  input_text: string;
  result: Record<string, unknown>;
  confidence: number;
  created_at: string;
}

export interface AnalysisStats {
  total_analyses_today: number;
  total_analyses_total: number;
  avg_confidence: number;
  by_type: Array<{
    type: AiModelType;
    count: number;
    avg_confidence: number;
  }>;
  by_model: Array<{
    model_id: string;
    model_name: string;
    type: AiModelType;
    analyses: number;
    avg_confidence: number;
  }>;
  accuracy_trend: Array<{
    date: string;
    accuracy: number;
  }>;
}

export interface AnalyzeRequest {
  text: string;
  feedback_id?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchAnalyzeRequest {
  feedback_ids?: string[];
  texts?: string[];
  analysis_types?: AiModelType[];
}

export interface CreateModelRequest {
  name: string;
  model_type: AiModelType;
  description?: string;
  config?: Record<string, unknown>;
  training_data_ids?: string[];
}

export const aiAnalysisApi = {
  // ==================== 情感分析 ====================

  analyzeSentiment: async (data: AnalyzeRequest): Promise<ApiResponse<SentimentResult>> => {
    return apiClient.feedback.post('/feedback/ai/sentiment', data);
  },

  // ==================== 自动分类 ====================

  classifyFeedback: async (data: AnalyzeRequest): Promise<ApiResponse<ClassificationResult>> => {
    return apiClient.feedback.post('/feedback/ai/classify', data);
  },

  // ==================== 优先级预测 ====================

  predictPriority: async (data: AnalyzeRequest): Promise<ApiResponse<PriorityPrediction>> => {
    return apiClient.feedback.post('/feedback/ai/predict-priority', data);
  },

  // ==================== 相似反馈检测 ====================

  findSimilar: async (
    data: AnalyzeRequest & { threshold?: number; limit?: number }
  ): Promise<ApiResponse<SimilarFeedback[]>> => {
    return apiClient.feedback.post('/feedback/ai/find-similar', data);
  },

  // ==================== AI 回复生成 ====================

  generateResponse: async (
    data: AnalyzeRequest & { tone?: 'formal' | 'friendly' | 'technical' }
  ): Promise<ApiResponse<GeneratedResponse>> => {
    return apiClient.feedback.post('/feedback/ai/generate-response', data);
  },

  // ==================== 关键问题提取 ====================

  extractIssues: async (params?: {
    time_range?: 'week' | 'month' | 'quarter';
    min_occurrences?: number;
  }): Promise<ApiResponse<ExtractedIssue[]>> => {
    return apiClient.feedback.get('/feedback/ai/extract-issues', { params });
  },

  // ==================== 趋势预测 ====================

  getTrendPrediction: async (params?: {
    horizon_days?: number;
    categories?: string[];
  }): Promise<ApiResponse<TrendPrediction>> => {
    return apiClient.feedback.get('/feedback/ai/trend-prediction', { params });
  },

  // ==================== 批量分析 ====================

  batchAnalyze: async (
    data: BatchAnalyzeRequest
  ): Promise<
    ApiResponse<
      Array<{
        feedback_id?: string;
        sentiment?: SentimentResult;
        classification?: ClassificationResult;
        priority?: PriorityPrediction;
      }>
    >
  > => {
    return apiClient.feedback.post('/feedback/ai/batch-analyze', data);
  },

  // ==================== AI 模型管理 ====================

  listModels: async (params?: {
    model_type?: AiModelType;
    status?: ModelStatus;
    is_default?: boolean;
  }): Promise<ApiResponse<AiModel[]>> => {
    return apiClient.feedback.get('/feedback/ai/models', { params });
  },

  createModel: async (data: CreateModelRequest): Promise<ApiResponse<AiModel>> => {
    return apiClient.feedback.post('/feedback/ai/models', data);
  },

  getModel: async (id: string): Promise<ApiResponse<AiModel>> => {
    return apiClient.feedback.get(`/feedback/ai/models/${id}`);
  },

  updateModel: async (
    id: string,
    data: Partial<CreateModelRequest>
  ): Promise<ApiResponse<AiModel>> => {
    return apiClient.feedback.put(`/feedback/ai/models/${id}`, data);
  },

  deleteModel: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/ai/models/${id}`);
  },

  testModel: async (
    id: string,
    data: { text: string; expected_result?: string }
  ): Promise<
    ApiResponse<{
      actual_result: Record<string, unknown>;
      expected_result?: string;
      accuracy?: number;
      passed: boolean;
    }>
  > => {
    return apiClient.feedback.post(`/feedback/ai/models/${id}/test`, data);
  },

  // ==================== 分析历史与统计 ====================

  listAnalysisHistory: async (params?: {
    feedback_id?: string;
    model_id?: string;
    analysis_type?: AiModelType;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<AnalysisHistory[]>> => {
    return apiClient.feedback.get('/feedback/ai/analysis-history', { params });
  },

  getAnalysisStats: async (): Promise<ApiResponse<AnalysisStats>> => {
    return apiClient.feedback.get('/feedback/ai/analysis-stats');
  },

  // ==================== 反馈学习 ====================

  submitFeedbackForLearning: async (data: {
    feedback_id: string;
    model_id: string;
    analysis_type: AiModelType;
    correct_result: Record<string, unknown>;
    note?: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.feedback.post('/feedback/ai/feedback-learning', data);
  },
};

export default aiAnalysisApi;
