/**
 * Monitor · 告警路由与通知渠道 API 绑定
 *
 * 后端: svc/monitor/src/modules/monitor/alerts.rs
 * 路由:
 *   GET    /rules/{id}/routing
 *   PUT    /rules/{id}/routing
 *   GET    /rules/{id}/escalation
 *   PUT    /rules/{id}/escalation
 *   GET    /rules/{id}/advanced
 *   PUT    /rules/{id}/advanced
 *   GET    /rules/{id}/scheduled-trigger
 *   PUT    /rules/{id}/scheduled-trigger
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type RoutingChannel =
  'email' | 'sms' | 'webhook' | 'in_app' | 'phone' | 'slack' | 'dingtalk';
export type EscalationTargetType = 'user' | 'group' | 'webhook' | 'email' | 'phone';

export interface RoutingConfig {
  id: string;
  rule_id: string;
  channel: RoutingChannel;
  target: string;
  target_type?: 'user' | 'group' | 'webhook';
  template_id?: string;
  enabled: boolean;
  priority: number;
  conditions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EscalationLevel {
  id: string;
  rule_id: string;
  level: number;
  after_minutes: number;
  target_type: EscalationTargetType;
  target_id: string;
  target_name?: string;
  severity_override?: 'critical' | 'warning' | 'info';
  repeat_count?: number;
  enabled: boolean;
  created_at: string;
}

export interface AdvancedConfig {
  id: string;
  rule_id: string;
  evaluation_interval_seconds: number;
  mute_duration_minutes?: number;
  repeat_every_minutes?: number;
  max_occurrences?: number;
  dedup_key?: string;
  severity_map?: Record<string, string>;
  cooldown_period_minutes?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTrigger {
  id: string;
  rule_id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface RoutingConfigInput {
  channel: RoutingChannel;
  target: string;
  target_type?: 'user' | 'group' | 'webhook';
  template_id?: string;
  enabled?: boolean;
  priority?: number;
  conditions?: Record<string, unknown>;
}

interface EscalationLevelInput {
  level: number;
  after_minutes: number;
  target_type: EscalationTargetType;
  target_id: string;
  severity_override?: 'critical' | 'warning' | 'info';
  repeat_count?: number;
  enabled?: boolean;
}

interface AdvancedConfigInput {
  evaluation_interval_seconds?: number;
  mute_duration_minutes?: number;
  repeat_every_minutes?: number;
  max_occurrences?: number;
  dedup_key?: string;
  severity_map?: Record<string, string>;
  cooldown_period_minutes?: number;
  is_active?: boolean;
}

export const routingApi = {
  getRouting: async (ruleId: string): Promise<ApiResponse<RoutingConfig[]>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/routing`);
  },

  updateRouting: async (
    ruleId: string,
    configs: RoutingConfigInput[]
  ): Promise<ApiResponse<RoutingConfig[]>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/routing`, configs);
  },

  getEscalation: async (ruleId: string): Promise<ApiResponse<EscalationLevel[]>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/escalation`);
  },

  updateEscalation: async (
    ruleId: string,
    levels: EscalationLevelInput[]
  ): Promise<ApiResponse<EscalationLevel[]>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/escalation`, levels);
  },

  getAdvanced: async (ruleId: string): Promise<ApiResponse<AdvancedConfig>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/advanced`);
  },

  updateAdvanced: async (
    ruleId: string,
    data: AdvancedConfigInput
  ): Promise<ApiResponse<AdvancedConfig>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/advanced`, data);
  },

  getScheduledTrigger: async (ruleId: string): Promise<ApiResponse<ScheduledTrigger>> => {
    return apiClient.monitor.get(`/rules/${ruleId}/scheduled-trigger`);
  },

  updateScheduledTrigger: async (
    ruleId: string,
    data: {
      cron_expression: string;
      timezone?: string;
      enabled?: boolean;
      conditions?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<ScheduledTrigger>> => {
    return apiClient.monitor.put(`/rules/${ruleId}/scheduled-trigger`, data);
  },
};

export default routingApi;
