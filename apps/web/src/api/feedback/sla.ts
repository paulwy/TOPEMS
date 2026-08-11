/**
 * Feedback · SLA 策略与计算 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedback/sla-policies
 *   POST   /feedback/sla-policies
 *   GET    /feedback/sla-policies/{id}
 *   PUT    /feedback/sla-policies/{id}
 *   DELETE /feedback/sla-policies/{id}
 *   GET    /feedbacks/{id}/sla
 *   POST   /feedbacks/{id}/sla/calculate
 *   GET    /feedback/sla-stats
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface FeedbackSlaPolicy {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  feedback_type?: string;
  response_hours: number;
  resolution_hours: number;
  escalation_levels: number;
  escalation_hours_1?: number;
  escalation_hours_2?: number;
  working_hours_only?: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSlaInfo {
  sla_due_at?: string;
  response_due_at?: string;
  is_breached: boolean;
  response_breached: boolean;
  time_remaining_minutes?: number;
  response_time_remaining_minutes?: number;
  current_escalation_level: number;
  policy_name?: string;
  resolution_hours?: number;
  response_hours?: number;
}

export interface CreateSlaPolicyRequest {
  name: string;
  description?: string;
  feedback_type?: string;
  response_hours: number;
  resolution_hours: number;
  escalation_levels: number;
  escalation_hours_1?: number;
  escalation_hours_2?: number;
  working_hours_only?: boolean;
  is_default?: boolean;
}

export interface FeedbackSlaStats {
  total: number;
  on_time: number;
  breached: number;
  breach_rate: number;
  avg_resolution_hours?: number;
  avg_response_hours?: number;
  byType: Array<{ feedback_type: string; total: number; breached: number }>;
}

export const slaApi = {
  listSlaPolicies: async (): Promise<ApiResponse<FeedbackSlaPolicy[]>> => {
    return apiClient.feedback.get('/feedback/sla-policies');
  },

  getSlaPolicy: async (id: string): Promise<ApiResponse<FeedbackSlaPolicy>> => {
    return apiClient.feedback.get(`/feedback/sla-policies/${id}`);
  },

  createSlaPolicy: async (
    data: CreateSlaPolicyRequest
  ): Promise<ApiResponse<FeedbackSlaPolicy>> => {
    return apiClient.feedback.post('/feedback/sla-policies', data);
  },

  updateSlaPolicy: async (
    id: string,
    data: Partial<CreateSlaPolicyRequest>
  ): Promise<ApiResponse<FeedbackSlaPolicy>> => {
    return apiClient.feedback.put(`/feedback/sla-policies/${id}`, data);
  },

  deleteSlaPolicy: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.feedback.delete(`/feedback/sla-policies/${id}`);
  },

  getFeedbackSla: async (id: string): Promise<ApiResponse<FeedbackSlaInfo>> => {
    return apiClient.feedback.get(`/feedbacks/${id}/sla`);
  },

  calculateFeedbackSla: async (id: string): Promise<ApiResponse<FeedbackSlaInfo>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/sla/calculate`);
  },

  getSlaStats: async (): Promise<ApiResponse<FeedbackSlaStats>> => {
    return apiClient.feedback.get('/feedback/sla-stats');
  },
};

export default slaApi;
