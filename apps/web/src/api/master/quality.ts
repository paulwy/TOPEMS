import apiClient from '../client';
import type { ApiResponse } from '../client';

export type QualityStatus = 'passed' | 'failed' | 'warning';
export type FixStatus = 'pending' | 'applied' | 'verified' | 'failed';
export type SuggestionType = 'standardize' | 'enrich' | 'deprecate' | 'merge';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type AutoFixActionType =
  | 'normalize'
  | 'default_value'
  | 'map_value'
  | 'remove_duplicate'
  | 'standardize';

export interface QualityCheckV51 {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  status: QualityStatus;
  score: number;
  details?: Record<string, unknown>;
  checked_at: string;
}

export interface QualityRule {
  id: string;
  name: string;
  entity_type: string;
  rule_type: string;
  description?: string;
  severity: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QualityDashboard {
  total_entities: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  pass_rate: number;
  checks_by_entity_type?: Array<{ entity_type: string; total: number; passed: number; failed: number }>;
  recent_checks?: QualityCheckV51[];
}

export interface QualityScore {
  overall_score: number;
  by_entity_type?: Record<string, number>;
  by_severity?: Record<string, number>;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
}

export interface AutoFixAction {
  id: string;
  rule_id: string;
  entity_type: string;
  entity_id: string;
  action_type: AutoFixActionType;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  confidence: number;
  status: FixStatus;
  applied_at?: string;
}

export interface GovernanceSuggestion {
  id: string;
  entity_type: string;
  entity_id: string;
  suggestion_type: SuggestionType;
  confidence: number;
  rationale: string;
  suggested_action: string;
  ai_model_version: string;
  status: SuggestionStatus;
  created_at: string;
}

export interface GovernanceInsight {
  insight_type: string;
  severity: string;
  affected_records: number;
  trend_analysis: string;
  recommendations: string[];
}

export interface CreateQualityRuleRequest {
  name: string;
  entity_type: string;
  rule_type: string;
  severity: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface UpdateQualityRuleRequest {
  name?: string;
  rule_type?: string;
  severity?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  enabled?: boolean;
}

export interface RunQualityCheckRequest {
  entity_type: string;
  entity_id: string;
  rule_ids?: string[];
}

export interface AutoFixRequest {
  entity_type?: string;
  rule_ids?: string[];
  dry_run?: boolean;
}

export interface GenerateSuggestionsRequest {
  entity_type: string;
  entity_id?: string;
  suggestion_types?: SuggestionType[];
}

export const qualityApi = {
  // ==================== 质量仪表盘 ====================

  getDashboard: async (): Promise<ApiResponse<QualityDashboard>> => {
    return apiClient.master.get('/quality-v51/dashboard');
  },

  // ==================== 质量检查 ====================

  listChecks: async (params?: {
    entity_type?: string;
    status?: QualityStatus;
    rule_id?: string;
  }): Promise<ApiResponse<QualityCheckV51[]>> => {
    return apiClient.master.get('/quality-v51/checks', { params });
  },

  getCheckResults: async (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<QualityCheckV51[]>> => {
    return apiClient.master.get(`/quality-v51/checks/${entityType}/${entityId}`);
  },

  runCheck: async (data: RunQualityCheckRequest): Promise<ApiResponse<QualityCheckV51>> => {
    return apiClient.master.post('/quality-v51/checks', data);
  },

  // ==================== 质量规则 ====================

  listRules: async (params?: {
    entity_type?: string;
    rule_type?: string;
    severity?: string;
    enabled?: boolean;
  }): Promise<ApiResponse<QualityRule[]>> => {
    return apiClient.master.get('/quality-v51/rules', { params });
  },

  createRule: async (data: CreateQualityRuleRequest): Promise<ApiResponse<QualityRule>> => {
    return apiClient.master.post('/quality-v51/rules', data);
  },

  getRule: async (id: string): Promise<ApiResponse<QualityRule>> => {
    return apiClient.master.get(`/quality-v51/rules/${id}`);
  },

  updateRule: async (id: string, data: UpdateQualityRuleRequest): Promise<ApiResponse<QualityRule>> => {
    return apiClient.master.put(`/quality-v51/rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.delete(`/quality-v51/rules/${id}`);
  },

  // ==================== 质量评分 ====================

  getScore: async (params?: {
    entity_type?: string;
  }): Promise<ApiResponse<QualityScore>> => {
    return apiClient.master.get('/quality-v51/score', { params });
  },

  // ==================== 自动修复 ====================

  runAutoFix: async (data?: AutoFixRequest): Promise<ApiResponse<{
    fixed_count: number;
    failed_count: number;
    actions: AutoFixAction[];
  }>> => {
    return apiClient.master.post('/quality-v51/auto-fix/run', data || {});
  },

  getFixActions: async (params?: {
    status?: FixStatus;
    entity_type?: string;
  }): Promise<ApiResponse<AutoFixAction[]>> => {
    return apiClient.master.get('/quality-v51/auto-fix/actions', { params });
  },

  revertFixAction: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/quality-v51/auto-fix/actions/${id}/revert`, {});
  },

  getFixHistory: async (params?: {
    entity_type?: string;
    limit?: number;
  }): Promise<ApiResponse<Array<{ action: AutoFixAction; reverted?: boolean }>>> => {
    return apiClient.master.get('/quality-v51/auto-fix/history', { params });
  },

  runFixWorkflow: async (data?: {
    entity_type?: string;
    strategy?: string;
  }): Promise<ApiResponse<{ workflow_id: string; status: string }>> => {
    return apiClient.master.post('/quality-v51/auto-fix/workflow', data || {});
  },

  // ==================== AI 治理 ====================

  generateSuggestions: async (data: GenerateSuggestionsRequest): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.post('/quality-v51/ai/suggest', data);
  },

  getSuggestions: async (params?: {
    entity_type?: string;
    status?: SuggestionStatus;
    suggestion_type?: SuggestionType;
  }): Promise<ApiResponse<GovernanceSuggestion[]>> => {
    return apiClient.master.get('/quality-v51/ai/suggestions', { params });
  },

  approveSuggestion: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/quality-v51/ai/suggestions/${id}/approve`, {});
  },

  rejectSuggestion: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.post(`/quality-v51/ai/suggestions/${id}/reject`, {});
  },

  getGovernanceInsights: async (params?: {
    severity?: string;
  }): Promise<ApiResponse<GovernanceInsight[]>> => {
    return apiClient.master.get('/quality-v51/ai/insights', { params });
  },

  predictQualityTrend: async (data: {
    entity_type?: string;
    periods?: number;
  }): Promise<ApiResponse<{
    predictions: Array<{ period: string; predicted_score: number; confidence: number }>;
  }>> => {
    return apiClient.master.post('/quality-v51/ai/predict', data);
  },
};

export default qualityApi;
