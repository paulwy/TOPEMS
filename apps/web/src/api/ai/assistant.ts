import apiClient from '../client';
import type { ApiResponse } from '../client';

// 报表助手 - 自然语言生成报表
export interface ReportMetric {
  label: string;
  value: number;
  unit?: string;
}

export interface ReportAssistantRequest {
  query: string;
  data_source?: string;
  time_range?: string;
}

export interface ReportAssistantResponse {
  query: string;
  chart_type: 'line' | 'bar' | 'pie' | 'table' | 'metric';
  title: string;
  description?: string;
  sql?: string;
  data: any[];
  x_axis?: string;
  y_axis?: string | string[];
  metrics?: ReportMetric[];
}

// 流程助手 - 流程分析与优化建议
export interface FlowStep {
  step: number;
  name: string;
  description: string;
  responsible?: string;
  estimated_time?: string;
}

export interface FlowAssistantRequest {
  query: string;
  module?: string;
  context?: Record<string, any>;
}

export interface FlowAssistantResponse {
  query: string;
  title: string;
  description?: string;
  steps: FlowStep[];
  suggestions?: string[];
}

// 异常预测
export interface AnomalyPoint {
  timestamp: string;
  value: number;
  expected?: number;
  severity: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface AnomalyPredictRequest {
  metric: string;
  time_range?: string;
  data_source?: string;
  threshold?: number;
}

export interface AnomalyPredictResponse {
  metric: string;
  anomaly_count: number;
  summary: string;
  anomalies: AnomalyPoint[];
  suggestions?: string[];
}

// 知识库问答
export interface KnowledgeSource {
  title: string;
  content?: string;
  relevance?: number;
}

export interface KnowledgeAskRequest {
  question: string;
  knowledge_base?: string;
  top_k?: number;
}

export interface KnowledgeAskResponse {
  question: string;
  answer: string;
  sources: KnowledgeSource[];
  confidence: number;
  follow_up_questions?: string[];
}

export const assistantApi = {
  reportAssistant: (data: ReportAssistantRequest): Promise<ApiResponse<ReportAssistantResponse>> =>
    apiClient.ai.post<ReportAssistantResponse>('/assistant/report', data),
  flowAssistant: (data: FlowAssistantRequest): Promise<ApiResponse<FlowAssistantResponse>> =>
    apiClient.ai.post<FlowAssistantResponse>('/assistant/flow', data),
  anomalyPredict: (data: AnomalyPredictRequest): Promise<ApiResponse<AnomalyPredictResponse>> =>
    apiClient.ai.post<AnomalyPredictResponse>('/assistant/anomaly/predict', data),
  knowledgeAsk: (data: KnowledgeAskRequest): Promise<ApiResponse<KnowledgeAskResponse>> =>
    apiClient.ai.post<KnowledgeAskResponse>('/assistant/knowledge/ask', data),
};
