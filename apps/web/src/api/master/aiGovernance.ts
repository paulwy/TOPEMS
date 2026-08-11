import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface GovernanceAnalysis {
  id: string;
  entity_type: string;
  entity_id?: string;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggested_fix?: string;
    confidence: number;
  }>;
  summary: string;
  created_at: string;
}

export interface GovernanceSuggestion {
  id: string;
  analysis_id: string;
  entity_type: string;
  entity_id?: string;
  suggestion_type: 'standardize' | 'enrich' | 'merge' | 'deprecate';
  title: string;
  description: string;
  confidence: number;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
}

export interface AIGovernanceModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'training' | 'active' | 'deprecated';
  accuracy?: number;
  last_trained_at?: string;
}

export interface MatchRule {
  id: string;
  name: string;
  source_type: string;
  target_type: string;
  matching_fields: string[];
  algorithm: 'exact' | 'fuzzy' | 'semantic' | 'hybrid';
  threshold: number;
  enabled: boolean;
}

export interface MatchResult {
  id: string;
  source_entity: { type: string; id: string };
  target_entity: { type: string; id: string };
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
  matched_at: string;
}

export interface Classifier {
  id: string;
  name: string;
  entity_type: string;
  categories: Array<{ id: string; name: string; description?: string }>;
  model_type: string;
  accuracy?: number;
  enabled: boolean;
}

export const aiGovernanceApi = {
  // ==================== 数据治理 AI ====================

  analyze: async (data: {
    entity_type?: string;
    entity_id?: string;
    scope?: 'full' | 'sample' | 'targeted';
  }): Promise<ApiResponse<GovernanceAnalysis>> => {
    return apiClient.master.post('/mdm-v59/governance/analyze', data);
  },

  getSuggestions: async (params?: {
    entity_type?: string;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.get('/mdm-v59/governance/suggestions', { params });
  },

  getEntitySuggestions: async (id: string): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.get(`/mdm-v59/governance/entity/${id}`);
  },

  applySuggestion: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/mdm-v59/governance/apply/${id}`, {});
  },

  dismissSuggestion: async (id: string, data?: { reason?: string }): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/mdm-v59/governance/dismiss/${id}`, data || {});
  },

  getModels: async (): Promise<ApiResponse<AIGovernanceModel[]>> => {
    return apiClient.master.get('/mdm-v59/governance/models');
  },

  trainModel: async (id: string, data?: {
    dataset?: string;
    parameters?: Record<string, unknown>;
  }): Promise<ApiResponse<{ training_job_id: string; status: string }>> => {
    return apiClient.master.post(`/mdm-v59/governance/train/${id}`, data || {});
  },

  // ==================== 智能匹配 ====================

  createMatchRule: async (data: Omit<MatchRule, 'id'>): Promise<ApiResponse<MatchRule>> => {
    return apiClient.master.post('/mdm-v59/matching/rule', data);
  },

  getMatchRules: async (params?: {
    source_type?: string;
    target_type?: string;
    enabled?: boolean;
  }): Promise<ApiResponse<MatchRule[]>> => {
    return apiClient.master.get('/mdm-v59/matching/rules', { params });
  },

  matchEntities: async (data: {
    entity_type?: string;
    entity_ids?: string[];
    rule_ids?: string[];
  }): Promise<ApiResponse<{ job_id: string; matched_count: number }>> => {
    return apiClient.master.post('/mdm-v59/matching/entities', data);
  },

  getMatchResults: async (params?: {
    entity_type?: string;
    status?: string;
    rule_id?: string;
  }): Promise<ApiResponse<MatchResult[]>> => {
    return apiClient.master.get('/mdm-v59/matching/results', { params });
  },

  reviewMatch: async (id: string, data: {
    decision: 'confirm' | 'reject';
    note?: string;
  }): Promise<ApiResponse<MatchResult>> => {
    return apiClient.master.post(`/mdm-v59/matching/review/${id}`, data);
  },

  confirmMatch: async (id: string): Promise<ApiResponse<MatchResult>> => {
    return apiClient.master.post(`/mdm-v59/matching/confirm/${id}`, {});
  },

  rejectMatch: async (id: string, data?: { reason?: string }): Promise<ApiResponse<MatchResult>> => {
    return apiClient.master.post(`/mdm-v59/matching/reject/${id}`, data || {});
  },

  getMatchStats: async (params?: {
    entity_type?: string;
    time_range?: 'today' | 'week' | 'month';
  }): Promise<ApiResponse<{
    total_pairs: number;
    confirmed: number;
    rejected: number;
    pending: number;
    avg_confidence: number;
  }>> => {
    return apiClient.master.get('/mdm-v59/matching/stats', { params });
  },

  // ==================== 自动分类 ====================

  createClassifier: async (data: Omit<Classifier, 'id'>): Promise<ApiResponse<Classifier>> => {
    return apiClient.master.post('/mdm-v59/classifier', data);
  },

  getClassifiers: async (params?: {
    entity_type?: string;
    enabled?: boolean;
  }): Promise<ApiResponse<Classifier[]>> => {
    return apiClient.master.get('/mdm-v59/classifiers', { params });
  },

  classifyEntity: async (entityType: string, id: string): Promise<ApiResponse<{
    classification: string;
    confidence: number;
    alternatives?: Array<{ category: string; confidence: number }>;
  }>> => {
    return apiClient.master.post(`/mdm-v59/classify/${entityType}/${id}`, {});
  },

  getClassification: async (entityType: string, id: string): Promise<ApiResponse<{
    category: string;
    confidence: number;
    classified_at: string;
    classifier_id: string;
  }>> => {
    return apiClient.master.get(`/mdm-v59/classification/${entityType}/${id}`);
  },

  getEntityCategories: async (entityType: string): Promise<ApiResponse<Array<{
    category: string;
    count: number;
  }>>> => {
    return apiClient.master.get(`/mdm-v59/classification/categories/${entityType}`);
  },

  reviewClassification: async (id: string, data: {
    correct: boolean;
    corrected_category?: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/mdm-v59/classification/review/${id}`, data);
  },

  getClassificationStats: async (params?: {
    entity_type?: string;
  }): Promise<ApiResponse<{
    total_classified: number;
    avg_confidence: number;
    categories: Array<{ name: string; count: number; accuracy: number }>;
  }>> => {
    return apiClient.master.get('/mdm-v59/classification/stats', { params });
  },

  updateClassifierRules: async (id: string, data: {
    rules: Array<{ pattern: string; category: string }>;
  }): Promise<ApiResponse<Classifier>> => {
    return apiClient.master.post(`/mdm-v59/classifier/rules/${id}`, data);
  },
};

export default aiGovernanceApi;
