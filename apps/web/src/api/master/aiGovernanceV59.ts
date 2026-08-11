import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type EntityType = 'customer' | 'supplier' | 'product' | 'material' | 'order' | 'invoice' | 'employee' | 'document';
export type SuggestionType = 'naming' | 'duplicate' | 'missing' | 'inconsistency' | 'standardization';
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed';
export type MatchStatus = 'pending' | 'reviewed' | 'confirmed' | 'rejected';
export type ClassifierType = 'rule_based' | 'ml' | 'hybrid';

export interface GovernanceSuggestionV59 {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  confidence: number;
  status: SuggestionStatus;
  created_at: string;
  applied_at?: string;
}

export interface GovernanceModel {
  id: string;
  name: string;
  version: string;
  type: ClassifierType;
  accuracy: number;
  last_trained_at?: string;
  parameters?: Record<string, unknown>;
}

export interface MatchRule {
  id: string;
  name: string;
  source_type: EntityType;
  target_type: EntityType;
  match_fields: Array<{ source: string; target: string; weight: number }>;
  threshold: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  id: string;
  source_entity: { type: EntityType; id: string };
  target_entity: { type: EntityType; id: string };
  match_score: number;
  status: MatchStatus;
  matched_at: string;
  reviewed_at?: string;
}

export interface MatchStats {
  total_pairs: number;
  pending_review: number;
  confirmed: number;
  rejected: number;
  avg_confidence: number;
  by_type: Array<{ type: EntityType; count: number }>;
}

export interface Classifier {
  id: string;
  name: string;
  classifier_type: ClassifierType;
  entity_types: EntityType[];
  categories: string[];
  accuracy: number;
  status: 'active' | 'inactive' | 'training';
  created_at: string;
  updated_at: string;
}

export interface ClassificationResult {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  category: string;
  confidence: number;
  classifier_id: string;
  classified_at: string;
  reviewed?: boolean;
}

export interface ClassificationStats {
  total_classified: number;
  by_category: Array<{ category: string; count: number; avg_confidence: number }>;
  by_entity_type: Array<{ type: EntityType; count: number }>;
  pending_review: number;
  last_classified_at?: string;
}

// ============ Request Types ============

export interface AnalyzeRequest {
  entity_type?: EntityType;
  entity_id?: string;
  focus_areas?: SuggestionType[];
}

export interface TrainModelRequest {
  entity_type: EntityType;
  model_type: ClassifierType;
  parameters?: Record<string, unknown>;
}

export interface CreateMatchRuleRequest {
  name: string;
  source_type: EntityType;
  target_type: EntityType;
  match_fields: Array<{ source: string; target: string; weight: number }>;
  threshold?: number;
}

export interface MatchEntitiesRequest {
  rule_id?: string;
  source_type?: EntityType;
  target_type?: EntityType;
  entity_ids?: string[];
  min_score?: number;
}

export interface ReviewMatchRequest {
  action: 'confirm' | 'reject';
  reason?: string;
}

export interface CreateClassifierRequest {
  name: string;
  classifier_type: ClassifierType;
  entity_types: EntityType[];
  categories: string[];
  rules?: Array<{ condition: string; category: string }>;
}

export interface ClassifyEntityRequest {
  classifier_id?: string;
  entity_type: EntityType;
  entity_id: string;
  context?: Record<string, unknown>;
}

export interface ReviewClassificationRequest {
  category: string;
  action: 'approve' | 'reassign';
  reason?: string;
}

// ============ API ============

export const aiGovernanceApiV59 = {
  // ===== 治理分析 =====
  async analyze(data: AnalyzeRequest): Promise<ApiResponse<GovernanceSuggestionV59[]>> {
    return apiClient.master.post<GovernanceSuggestionV59[]>('/mdm-v59/governance/analyze', data);
  },

  async getSuggestions(params?: { entity_type?: EntityType; entity_id?: string; status?: SuggestionType }): Promise<ApiResponse<GovernanceSuggestionV59[]>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.entity_id) qs.set('entity_id', params.entity_id);
    const s = qs.toString();
    return apiClient.master.get<GovernanceSuggestionV59[]>(`/mdm-v59/governance/suggestions${s ? `?${s}` : ''}`);
  },

  async getEntitySuggestions(id: string): Promise<ApiResponse<GovernanceSuggestionV59[]>> {
    return apiClient.master.get<GovernanceSuggestionV59[]>(`/mdm-v59/governance/entity/${id}`);
  },

  async applySuggestion(id: string): Promise<ApiResponse<GovernanceSuggestionV59>> {
    return apiClient.master.post<GovernanceSuggestionV59>(`/mdm-v59/governance/apply/${id}`, {});
  },

  async dismissSuggestion(id: string, reason?: string): Promise<ApiResponse<{ dismissed: boolean }>> {
    return apiClient.master.post<{ dismissed: boolean }>(`/mdm-v59/governance/dismiss/${id}`, { reason });
  },

  // ===== 模型管理 =====
  async getModels(): Promise<ApiResponse<GovernanceModel[]>> {
    return apiClient.master.get<GovernanceModel[]>('/mdm-v59/governance/models');
  },

  async trainModel(id: string, data?: TrainModelRequest): Promise<ApiResponse<GovernanceModel>> {
    return apiClient.master.post<GovernanceModel>(`/mdm-v59/governance/train/${id}`, data || {});
  },

  // ===== 智能匹配 =====
  async createMatchRule(data: CreateMatchRuleRequest): Promise<ApiResponse<MatchRule>> {
    return apiClient.master.post<MatchRule>('/mdm-v59/matching/rule', data);
  },

  async getMatchRules(): Promise<ApiResponse<MatchRule[]>> {
    return apiClient.master.get<MatchRule[]>('/mdm-v59/matching/rules');
  },

  async matchEntities(data: MatchEntitiesRequest): Promise<ApiResponse<MatchResult[]>> {
    return apiClient.master.post<MatchResult[]>('/mdm-v59/matching/entities', data);
  },

  async getMatchResults(params?: { status?: MatchStatus; rule_id?: string }): Promise<ApiResponse<MatchResult[]>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.rule_id) qs.set('rule_id', params.rule_id);
    const s = qs.toString();
    return apiClient.master.get<MatchResult[]>(`/mdm-v59/matching/results${s ? `?${s}` : ''}`);
  },

  async reviewMatch(id: string, data: ReviewMatchRequest): Promise<ApiResponse<MatchResult>> {
    return apiClient.master.post<MatchResult>(`/mdm-v59/matching/review/${id}`, data);
  },

  async confirmMatch(id: string): Promise<ApiResponse<MatchResult>> {
    return apiClient.master.post<MatchResult>(`/mdm-v59/matching/confirm/${id}`, {});
  },

  async rejectMatch(id: string, reason?: string): Promise<ApiResponse<MatchResult>> {
    return apiClient.master.post<MatchResult>(`/mdm-v59/matching/reject/${id}`, { reason });
  },

  async getMatchStats(): Promise<ApiResponse<MatchStats>> {
    return apiClient.master.get<MatchStats>('/mdm-v59/matching/stats');
  },

  // ===== 自动分类 =====
  async createClassifier(data: CreateClassifierRequest): Promise<ApiResponse<Classifier>> {
    return apiClient.master.post<Classifier>('/mdm-v59/classifier', data);
  },

  async getClassifiers(): Promise<ApiResponse<Classifier[]>> {
    return apiClient.master.get<Classifier[]>('/mdm-v59/classifiers');
  },

  async classifyEntity(entityType: EntityType, id: string, data?: ClassifyEntityRequest): Promise<ApiResponse<ClassificationResult>> {
    return apiClient.master.post<ClassificationResult>(`/mdm-v59/classify/${entityType}/${id}`, data || {});
  },

  async getClassification(entityType: EntityType, id: string): Promise<ApiResponse<ClassificationResult>> {
    return apiClient.master.get<ClassificationResult>(`/mdm-v59/classification/${entityType}/${id}`);
  },

  async getEntityCategories(entityType: EntityType): Promise<ApiResponse<string[]>> {
    return apiClient.master.get<string[]>(`/mdm-v59/classification/categories/${entityType}`);
  },

  async reviewClassification(id: string, data: ReviewClassificationRequest): Promise<ApiResponse<ClassificationResult>> {
    return apiClient.master.post<ClassificationResult>(`/mdm-v59/classification/review/${id}`, data);
  },

  async getClassificationStats(): Promise<ApiResponse<ClassificationStats>> {
    return apiClient.master.get<ClassificationStats>('/mdm-v59/classification/stats');
  },

  async updateClassifierRules(id: string, rules: Array<{ condition: string; category: string }>): Promise<ApiResponse<Classifier>> {
    return apiClient.master.post<Classifier>(`/mdm-v59/classifier/rules/${id}`, { rules });
  },
};

export default aiGovernanceApiV59;
