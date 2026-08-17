import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface RuleAdvancedConfig {
  evaluation_interval_seconds?: number;
  mute_duration_minutes?: number;
  repeat_every_minutes?: number;
  max_occurrences?: number;
  dedup_key?: string;
  severity_map?: Record<string, string>;
}

export interface RuleEscalationLevel {
  level: number;
  after_minutes: number;
  target_type: 'user' | 'group' | 'webhook' | 'email';
  target_id: string;
  severity_override?: string;
}

export interface RuleRoutingConfig {
  channel: 'email' | 'sms' | 'webhook' | 'in_app' | 'phone';
  target: string;
  template_id?: string;
  enabled: boolean;
}

export interface RuleScheduledTrigger {
  cron_expression: string;
  timezone?: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
}

export const ruleAdvancedApi = {
  getAdvancedConfig: (ruleId: string): Promise<ApiResponse<RuleAdvancedConfig>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/advanced`);
  },

  updateAdvancedConfig: (
    ruleId: string,
    data: Partial<RuleAdvancedConfig>
  ): Promise<ApiResponse<RuleAdvancedConfig>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/advanced`, data);
  },

  getEscalation: (ruleId: string): Promise<ApiResponse<RuleEscalationLevel[]>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/escalation`);
  },

  updateEscalation: (
    ruleId: string,
    levels: RuleEscalationLevel[]
  ): Promise<ApiResponse<RuleEscalationLevel[]>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/escalation`, levels);
  },

  getRouting: (ruleId: string): Promise<ApiResponse<RuleRoutingConfig[]>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/routing`);
  },

  updateRouting: (
    ruleId: string,
    configs: RuleRoutingConfig[]
  ): Promise<ApiResponse<RuleRoutingConfig[]>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/routing`, configs);
  },

  getScheduledTrigger: (ruleId: string): Promise<ApiResponse<RuleScheduledTrigger>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/scheduled-trigger`);
  },

  updateScheduledTrigger: (
    ruleId: string,
    data: RuleScheduledTrigger
  ): Promise<ApiResponse<RuleScheduledTrigger>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/scheduled-trigger`, data);
  },
};

export default ruleAdvancedApi;
