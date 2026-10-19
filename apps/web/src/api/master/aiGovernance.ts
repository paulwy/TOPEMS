import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * Mdm V59 数据治理 AI / 智能匹配 / 自动分类
 * 契约（svc/master-data/src/modules/ai_governance_v59.rs）：
 * /mdm-v59 下 23 端点；前端经 apiClient.master（/api/master-data）访问
 */

export interface GovernanceSuggestion {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  confidence: number;
  action: string;
  created_at: string;
}

export interface GovernanceModel {
  id: string;
  name: string;
  version: string;
  domain: string;
  accuracy: number;
  last_trained?: string;
  features: string[];
}

export interface MatchRule {
  id: string;
  name: string;
  rule_type: string;
  field_config: Record<string, unknown>;
  threshold: number;
  enabled: boolean;
}

export interface MatchResult {
  id: string;
  source_id: string;
  target_id: string;
  match_score: number;
  match_type: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
  matched_at: string;
}

export interface MatchStats {
  total_rules: number;
  total_results: number;
  confirmed: number;
  rejected: number;
  pending: number;
  avg_score: number;
}

export interface ClassificationModel {
  id: string;
  name: string;
  entity_type: string;
  categories: string[];
  algorithm?: string;
  accuracy?: number;
}

export interface ClassificationResult {
  id: string;
  entity_type: string;
  entity_id: string;
  suggested_category: string;
  confidence: number;
  approved: boolean;
  classified_at: string;
}

export interface ClassificationStats {
  total_classifications: number;
  approved: number;
  pending: number;
  accuracy: number;
}

export const aiGovernanceApi = {
  // ===== 治理建议 =====
  analyze: async (data: {
    entity_type: string;
    entity_id: string;
  }): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.post('/mdm-v59/governance/analyze', data);
  },

  getSuggestions: async (params?: {
    entity_type?: string;
    entity_id?: string;
  }): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.get('/mdm-v59/governance/suggestions', { params });
  },

  getEntitySuggestions: async (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.get(`/mdm-v59/governance/entity/${entityType}/${entityId}`);
  },

  applySuggestion: async (suggestionId: string): Promise<ApiResponse<{ applied: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/governance/apply/${suggestionId}`);
  },

  dismissSuggestion: async (suggestionId: string): Promise<ApiResponse<{ dismissed: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/governance/dismiss/${suggestionId}`);
  },

  getModels: async (): Promise<ApiResponse<GovernanceModel[]>> => {
    return apiClient.master.get('/mdm-v59/governance/models');
  },

  trainModel: async (modelId: string): Promise<ApiResponse<{ trained: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/governance/train/${modelId}`);
  },

  // ===== 智能匹配 =====
  createMatchRule: async (data: {
    name: string;
    rule_type: string;
    field_config: Record<string, unknown>;
    threshold?: number;
  }): Promise<ApiResponse<MatchRule>> => {
    return apiClient.master.post('/mdm-v59/matching/rule', data);
  },

  getMatchRules: async (): Promise<ApiResponse<MatchRule[]>> => {
    return apiClient.master.get('/mdm-v59/matching/rules');
  },

  matchEntities: async (data: {
    source_id: string;
    target_id: string;
    entity_type?: string;
  }): Promise<ApiResponse<MatchResult>> => {
    return apiClient.master.post('/mdm-v59/matching/entities', data);
  },

  getMatchResults: async (): Promise<ApiResponse<MatchResult[]>> => {
    return apiClient.master.get('/mdm-v59/matching/results');
  },

  reviewMatch: async (
    matchId: string,
    action: string
  ): Promise<ApiResponse<{ reviewed: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/matching/review/${matchId}`, { action });
  },

  confirmMatch: async (matchId: string): Promise<ApiResponse<{ confirmed: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/matching/confirm/${matchId}`);
  },

  rejectMatch: async (matchId: string): Promise<ApiResponse<{ rejected: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/matching/reject/${matchId}`);
  },

  getMatchStats: async (): Promise<ApiResponse<MatchStats>> => {
    return apiClient.master.get('/mdm-v59/matching/stats');
  },

  // ===== 自动分类 =====
  createClassifier: async (data: {
    name: string;
    entity_type: string;
    categories: string[];
    algorithm?: string;
  }): Promise<ApiResponse<ClassificationModel>> => {
    return apiClient.master.post('/mdm-v59/classifier', data);
  },

  getClassifiers: async (): Promise<ApiResponse<ClassificationModel[]>> => {
    return apiClient.master.get('/mdm-v59/classifiers');
  },

  classifyEntity: async (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ClassificationResult>> => {
    return apiClient.master.post(`/mdm-v59/classify/${entityType}/${entityId}`);
  },

  getClassification: async (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ClassificationResult>> => {
    return apiClient.master.get(`/mdm-v59/classification/${entityType}/${entityId}`);
  },

  getEntityCategories: async (
    entityType: string
  ): Promise<ApiResponse<{ categories: string[] }>> => {
    return apiClient.master.get(`/mdm-v59/classification/categories/${entityType}`);
  },

  reviewClassification: async (
    classificationId: string,
    approved: boolean,
    correctedCategory?: string
  ): Promise<ApiResponse<{ reviewed: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/classification/review/${classificationId}`, {
      approved,
      corrected_category: correctedCategory,
    });
  },

  getClassificationStats: async (): Promise<ApiResponse<ClassificationStats>> => {
    return apiClient.master.get('/mdm-v59/classification/stats');
  },

  updateClassifierRules: async (
    classifierId: string,
    rules: unknown[]
  ): Promise<ApiResponse<{ updated: boolean }>> => {
    return apiClient.master.post(`/mdm-v59/classifier/rules/${classifierId}`, { rules });
  },
};

export default aiGovernanceApi;
