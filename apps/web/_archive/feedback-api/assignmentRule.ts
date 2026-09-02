/**
 * Feedback · 智能分派规则 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedback/assignment-rules
 *   POST   /feedback/assignment-rules
 *   GET    /feedback/assignment-rules/{id}
 *   PUT    /feedback/assignment-rules/{id}
 *   DELETE /feedback/assignment-rules/{id}
 *   POST   /feedback/assignment-rules/{id}/activate
 *   POST   /feedback/assignment-rules/{id}/deactivate
 *   POST   /feedback/assignment-rules/{id}/test
 *   GET    /feedback/assignment-rules/stats
 *   POST   /feedback/assignment-rules/auto-assign
 *   GET    /feedback/assignment-history
 *   POST   /feedback/assignment-rules/reorder
 *   GET    /feedback/assignment-rules/agents
 *   POST   /feedback/assignment-rules/agents
 *   DELETE /feedback/assignment-rules/agents/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AssignmentRuleType =
  'round_robin' | 'least_loaded' | 'skill_based' | 'ai_powered' | 'custom';
export type AssignmentRuleStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface AssignmentRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  rule_type: AssignmentRuleType;
  status: AssignmentRuleStatus;
  priority: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value: string | string[];
  }>;
  target: {
    type: 'user' | 'team' | 'role';
    id?: string;
    ids?: string[];
    team_id?: string;
    role_id?: string;
  };
  ai_config?: {
    model?: string;
    confidence_threshold?: number;
    consider_skills?: boolean;
    consider_workload?: boolean;
    consider_history?: boolean;
  };
  is_default: boolean;
  times_used: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentAgent {
  id: string;
  rule_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  skills: string[];
  current_load: number;
  max_load: number;
  is_active: boolean;
  last_assigned_at?: string;
  avg_resolution_days?: number;
  satisfaction_score?: number;
}

export interface CreateAssignmentRuleRequest {
  name: string;
  description?: string;
  rule_type: AssignmentRuleType;
  priority?: number;
  conditions?: AssignmentRule['conditions'];
  target: AssignmentRule['target'];
  ai_config?: AssignmentRule['ai_config'];
  is_default?: boolean;
}

export interface UpdateAssignmentRuleRequest {
  name?: string;
  description?: string;
  rule_type?: AssignmentRuleType;
  status?: AssignmentRuleStatus;
  priority?: number;
  conditions?: AssignmentRule['conditions'];
  target?: AssignmentRule['target'];
  ai_config?: AssignmentRule['ai_config'];
  is_default?: boolean;
}

export interface TestAssignmentRequest {
  rule_id?: string;
  feedback_type?: string;
  category?: string;
  priority?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AutoAssignRequest {
  feedback_id: string;
  feedback_type?: string;
  category?: string;
  priority?: string;
  skip_rules?: string[];
}

export interface AssignmentHistory {
  id: string;
  feedback_id: string;
  rule_id?: string;
  rule_name?: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_by: 'rule' | 'manual' | 'ai';
  reason?: string;
  confidence?: number;
  previous_assignee_id?: string;
  created_at: string;
}

export interface AssignmentRuleStats {
  total_rules: number;
  active_rules: number;
  total_assignments_today: number;
  auto_assignments: number;
  manual_assignments: number;
  ai_assignments: number;
  avg_confidence: number;
  by_type: Array<{
    type: AssignmentRuleType;
    count: number;
    assignments: number;
  }>;
  top_rules: Array<{
    rule_id: string;
    rule_name: string;
    assignments: number;
    success_rate: number;
  }>;
}

export const assignmentRuleApi = {
  // ==================== 分派规则管理 ====================

  listRules: async (params?: {
    status?: AssignmentRuleStatus;
    rule_type?: AssignmentRuleType;
    is_active?: boolean;
    search?: string;
  }): Promise<ApiResponse<AssignmentRule[]>> => {
    return apiClient.feedback.get('/feedback/assignment-rules', { params });
  },

  getRule: async (id: string): Promise<ApiResponse<AssignmentRule>> => {
    return apiClient.feedback.get(`/feedback/assignment-rules/${id}`);
  },

  createRule: async (data: CreateAssignmentRuleRequest): Promise<ApiResponse<AssignmentRule>> => {
    return apiClient.feedback.post('/feedback/assignment-rules', data);
  },

  updateRule: async (
    id: string,
    data: UpdateAssignmentRuleRequest
  ): Promise<ApiResponse<AssignmentRule>> => {
    return apiClient.feedback.put(`/feedback/assignment-rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/assignment-rules/${id}`);
  },

  activateRule: async (id: string): Promise<ApiResponse<AssignmentRule>> => {
    return apiClient.feedback.post(`/feedback/assignment-rules/${id}/activate`);
  },

  deactivateRule: async (id: string): Promise<ApiResponse<AssignmentRule>> => {
    return apiClient.feedback.post(`/feedback/assignment-rules/${id}/deactivate`);
  },

  testRule: async (
    id: string,
    data?: TestAssignmentRequest
  ): Promise<
    ApiResponse<{
      matched: boolean;
      assignee?: AssignmentAgent;
      confidence?: number;
      reason?: string;
    }>
  > => {
    return apiClient.feedback.post(`/feedback/assignment-rules/${id}/test`, data);
  },

  reorderRules: async (ruleIds: string[]): Promise<ApiResponse<void>> => {
    return apiClient.feedback.post('/feedback/assignment-rules/reorder', {
      rule_ids: ruleIds,
    });
  },

  // ==================== 智能分派 ====================

  autoAssign: async (
    data: AutoAssignRequest
  ): Promise<
    ApiResponse<{
      assigned_to: string;
      assigned_to_name: string;
      rule_id?: string;
      rule_name?: string;
      confidence?: number;
    }>
  > => {
    return apiClient.feedback.post('/feedback/assignment-rules/auto-assign', data);
  },

  // ==================== 分派历史 ====================

  listAssignmentHistory: async (params?: {
    feedback_id?: string;
    rule_id?: string;
    assigned_by?: 'rule' | 'manual' | 'ai';
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<AssignmentHistory[]>> => {
    return apiClient.feedback.get('/feedback/assignment-history', { params });
  },

  // ==================== 分派代理/成员管理 ====================

  listAgents: async (ruleId: string): Promise<ApiResponse<AssignmentAgent[]>> => {
    return apiClient.feedback.get('/feedback/assignment-rules/agents', {
      params: { rule_id: ruleId },
    });
  },

  addAgent: async (data: {
    rule_id: string;
    user_id: string;
    skills?: string[];
    max_load?: number;
  }): Promise<ApiResponse<AssignmentAgent>> => {
    return apiClient.feedback.post('/feedback/assignment-rules/agents', data);
  },

  removeAgent: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/assignment-rules/agents/${id}`);
  },

  // ==================== 统计 ====================

  getRuleStats: async (): Promise<ApiResponse<AssignmentRuleStats>> => {
    return apiClient.feedback.get('/feedback/assignment-rules/stats');
  },
};

export default assignmentRuleApi;
