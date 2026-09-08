/**
 * IM · 跨域桥接与消息转发 API 绑定
 *
 * 后端: IM 服务 /bridges/* /cross-domain/*
 * 路由:
 *   GET    /bridges
 *   POST   /bridges
 *   GET    /bridges/{id}
 *   PUT    /bridges/{id}
 *   DELETE /bridges/{id}
 *   POST   /bridges/{id}/activate
 *   POST   /bridges/{id}/deactivate
 *   POST   /bridges/{id}/test
 *   POST   /bridges/{id}/forward
 *   GET    /bridges/{id}/forward-rules
 *   POST   /bridges/{id}/forward-rules
 *   DELETE /bridges/{id}/forward-rules/{rule_id}
 *   GET    /bridges/{id}/deliveries
 *   GET    /cross-domains/channels
 *   POST   /cross-domains/channels
 *   GET    /cross-domains/channels/{id}
 *   PUT    /cross-domains/channels/{id}
 *   DELETE /cross-domains/channels/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type BridgeType = 'webhook' | 'email' | 'sms' | 'api' | 'plugin' | 'custom';
export type BridgeStatus = 'active' | 'inactive' | 'error' | 'testing';
export type DirectionType = 'inbound' | 'outbound' | 'bidirectional';
export type ForwardRuleAction = 'forward' | 'transform' | 'filter' | 'aggregate';

export interface Bridge {
  id: string;
  name: string;
  description?: string;
  bridge_type: BridgeType;
  status: BridgeStatus;
  direction: DirectionType;
  source_channel_id?: string;
  target_channel_ids: string[];
  config: Record<string, unknown>;
  transform_template?: string;
  filter_expression?: string;
  rate_limit_per_minute?: number;
  retry_policy?: {
    max_retries: number;
    retry_interval_ms: number;
    backoff_multiplier: number;
  };
  created_by: string;
  created_by_name: string;
  last_activity_at?: string;
  total_forwards: number;
  success_rate: number;
  avg_latency_ms: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBridgeRequest {
  name: string;
  description?: string;
  bridge_type: BridgeType;
  direction: DirectionType;
  source_channel_id?: string;
  target_channel_ids: string[];
  config: Record<string, unknown>;
  transform_template?: string;
  filter_expression?: string;
  rate_limit_per_minute?: number;
  retry_policy?: Bridge['retry_policy'];
}

export interface ForwardRule {
  id: string;
  bridge_id: string;
  name: string;
  action: ForwardRuleAction;
  trigger_type: 'keyword' | 'type' | 'sender' | 'metadata' | 'schedule';
  trigger_condition: Record<string, unknown>;
  transform?: Record<string, unknown>;
  is_active: boolean;
  priority: number;
  hit_count: number;
  last_hit_at?: string;
  created_at: string;
}

export interface CreateForwardRuleRequest {
  name: string;
  action: ForwardRuleAction;
  trigger_type: ForwardRule['trigger_type'];
  trigger_condition: Record<string, unknown>;
  transform?: Record<string, unknown>;
  is_active?: boolean;
  priority?: number;
}

export interface BridgeDelivery {
  id: string;
  bridge_id: string;
  bridge_name: string;
  source_message_id: string;
  source_channel_id: string;
  target_channel_id: string;
  target_channel_name: string;
  forward_status: 'pending' | 'processing' | 'delivered' | 'failed' | 'blocked';
  rule_id?: string;
  rule_name?: string;
  transformed_content?: string;
  response_status?: number;
  error_message?: string;
  retry_count: number;
  delivery_time_ms: number;
  created_at: string;
  delivered_at?: string;
}

export interface CrossDomainChannel {
  id: string;
  name: string;
  description?: string;
  domain_id: string;
  domain_name: string;
  domain_type: 'internal' | 'external' | 'partner';
  visibility: 'public' | 'private';
  connected_channels: string[];
  bridge_ids: string[];
  member_count: number;
  message_count_7d: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCrossDomainChannelRequest {
  name: string;
  description?: string;
  domain_id: string;
  domain_type: CrossDomainChannel['domain_type'];
  visibility?: CrossDomainChannel['visibility'];
  connected_channels?: string[];
}

export interface BridgeTestResult {
  success: boolean;
  messages_forwarded: number;
  messages_blocked: number;
  response_time_ms: number;
  errors: Array<{ channel_id: string; error: string }>;
}

export const imBridgeApi = {
  // ==================== Bridge CRUD ====================

  listBridges: async (params?: {
    bridge_type?: BridgeType;
    status?: BridgeStatus;
    direction?: DirectionType;
    search?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Bridge>>> => {
    return apiClient.im.get('/bridges', { params });
  },

  createBridge: async (data: CreateBridgeRequest): Promise<ApiResponse<Bridge>> => {
    return apiClient.im.post('/bridges', data);
  },

  getBridge: async (id: string): Promise<ApiResponse<Bridge>> => {
    return apiClient.im.get(`/bridges/${id}`);
  },

  updateBridge: async (
    id: string,
    data: Partial<
      Omit<
        Bridge,
        'id' | 'created_at' | 'updated_at' | 'total_forwards' | 'success_rate' | 'avg_latency_ms'
      >
    >
  ): Promise<ApiResponse<Bridge>> => {
    return apiClient.im.put(`/bridges/${id}`, data);
  },

  deleteBridge: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/bridges/${id}`);
  },

  // ==================== Bridge 状态 ====================

  activateBridge: async (id: string): Promise<ApiResponse<{ activated: boolean }>> => {
    return apiClient.im.post(`/bridges/${id}/activate`);
  },

  deactivateBridge: async (id: string): Promise<ApiResponse<{ deactivated: boolean }>> => {
    return apiClient.im.post(`/bridges/${id}/deactivate`);
  },

  testBridge: async (
    id: string,
    data?: { message_content?: string; channel_id?: string }
  ): Promise<ApiResponse<BridgeTestResult>> => {
    return apiClient.im.post(`/bridges/${id}/test`, data || {});
  },

  // ==================== 消息转发 ====================

  forwardMessage: async (
    id: string,
    data: {
      source_message_id: string;
      source_channel_id: string;
      content?: string;
    }
  ): Promise<ApiResponse<BridgeDelivery>> => {
    return apiClient.im.post(`/bridges/${id}/forward`, data);
  },

  // ==================== 转发规则 ====================

  listForwardRules: async (bridgeId: string): Promise<ApiResponse<ForwardRule[]>> => {
    return apiClient.im.get(`/bridges/${bridgeId}/forward-rules`);
  },

  createForwardRule: async (
    bridgeId: string,
    data: CreateForwardRuleRequest
  ): Promise<ApiResponse<ForwardRule>> => {
    return apiClient.im.post(`/bridges/${bridgeId}/forward-rules`, data);
  },

  updateForwardRule: async (
    bridgeId: string,
    ruleId: string,
    data: Partial<CreateForwardRuleRequest>
  ): Promise<ApiResponse<ForwardRule>> => {
    return apiClient.im.put(`/bridges/${bridgeId}/forward-rules/${ruleId}`, data);
  },

  deleteForwardRule: async (bridgeId: string, ruleId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/bridges/${bridgeId}/forward-rules/${ruleId}`);
  },

  // ==================== 投递记录 ====================

  listBridgeDeliveries: async (
    bridgeId: string,
    params?: {
      forward_status?: BridgeDelivery['forward_status'];
      from_time?: string;
      to_time?: string;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<BridgeDelivery>>> => {
    return apiClient.im.get(`/bridges/${bridgeId}/deliveries`, { params });
  },

  // ==================== 跨域频道 ====================

  listCrossDomainChannels: async (params?: {
    domain_type?: CrossDomainChannel['domain_type'];
    is_active?: boolean;
    search?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<CrossDomainChannel>>> => {
    return apiClient.im.get('/cross-domains/channels', { params });
  },

  createCrossDomainChannel: async (
    data: CreateCrossDomainChannelRequest
  ): Promise<ApiResponse<CrossDomainChannel>> => {
    return apiClient.im.post('/cross-domains/channels', data);
  },

  getCrossDomainChannel: async (id: string): Promise<ApiResponse<CrossDomainChannel>> => {
    return apiClient.im.get(`/cross-domains/channels/${id}`);
  },

  updateCrossDomainChannel: async (
    id: string,
    data: Partial<
      Omit<
        CrossDomainChannel,
        'id' | 'created_at' | 'updated_at' | 'member_count' | 'message_count_7d'
      >
    >
  ): Promise<ApiResponse<CrossDomainChannel>> => {
    return apiClient.im.put(`/cross-domains/channels/${id}`, data);
  },

  deleteCrossDomainChannel: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/cross-domains/channels/${id}`);
  },
};

export default imBridgeApi;
