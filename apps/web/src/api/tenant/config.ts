/**
 * Tenant · 租户配置管理 API 绑定
 *
 * 后端: svc/unified-core/src/modules/tenant.rs
 * 路由:
 *   GET    /tenant/{id}/settings
 *   PUT    /tenant/{id}/settings
 *   GET    /tenant/{id}/branding
 *   PUT    /tenant/{id}/branding
 *   GET    /tenant/{id}/features
 *   PUT    /tenant/{id}/features
 *   POST   /tenant/{id}/features/{feature}/enable
 *   POST   /tenant/{id}/features/{feature}/disable
 *   GET    /tenant/{id}/domains
 *   POST   /tenant/{id}/domains
 *   DELETE /tenant/{id}/domains/{domain}
 *   GET    /tenant/{id}/email-config
 *   PUT    /tenant/{id}/email-config
 *   GET    /tenant/{id}/integrations
 *   POST   /tenant/{id}/integrations
 *   PUT    /tenant/{id}/integrations/{id}
 *   DELETE /tenant/{id}/integrations/{id}
 *   GET    /tenant/{id}/webhooks
 *   POST   /tenant/{id}/webhooks
 *   PUT    /tenant/{id}/webhooks/{id}
 *   DELETE /tenant/{id}/webhooks/{id}
 *   POST   /tenant/{id}/webhooks/{id}/test
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { TenantPlan } from './types';

export interface TenantSettingsFull {
  id: string;
  tenant_id: string;
  general: GeneralSettings;
  branding: BrandingSettings;
  email: EmailSettings;
  features: Record<string, boolean>;
  integrations: IntegrationSettings;
  created_at: string;
  updated_at: string;
}

export interface GeneralSettings {
  timezone: string;
  language: string;
  currency: string;
  date_format: string;
  time_format: string;
  fiscal_year_start: string;
  default_currency: string;
  auto_logout_minutes: number;
  max_login_attempts: number;
  password_expiry_days: number;
}

export interface BrandingSettings {
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  sidebar_color?: string;
  header_color?: string;
  login_page_title?: string;
  login_page_subtitle?: string;
  custom_domain?: string;
  custom_css?: string;
}

export interface EmailSettings {
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: 'tls' | 'ssl' | 'none';
  from_email: string;
  from_name: string;
  reply_to_email?: string;
  enable_email_notifications: boolean;
  enable_digest_emails: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface IntegrationSettings {
  slack?: { enabled: boolean; webhook_url?: string; channel?: string };
  ms_teams?: { enabled: boolean; webhook_url?: string };
  dingtalk?: { enabled: boolean; webhook_url?: string; secret?: string };
  wechat_work?: { enabled: boolean; corp_id?: string; agent_id?: number };
  github?: { enabled: boolean; app_id?: string };
  gitlab?: { enabled: boolean; url?: string };
  jira?: { enabled: boolean; site_url?: string };
  custom_webhooks?: Array<{ name: string; url: string; secret?: string }>;
}

export interface TenantFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  plan: TenantPlan[];
  is_enabled: boolean;
  is_trial: boolean;
  requires_license: boolean;
}

export interface TenantDomain {
  id: string;
  domain: string;
  is_primary: boolean;
  ssl_enabled: boolean;
  verified: boolean;
  verification_token?: string;
  created_at: string;
}

export interface CreateDomainRequest {
  domain: string;
  is_primary?: boolean;
}

export interface UpdateEmailConfigRequest {
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: 'tls' | 'ssl' | 'none';
  from_email?: string;
  from_name?: string;
  reply_to_email?: string;
  enable_email_notifications?: boolean;
  enable_digest_emails?: boolean;
  digest_frequency?: 'daily' | 'weekly' | 'monthly';
}

export interface Integration {
  id: string;
  tenant_id: string;
  type: 'slack' | 'ms_teams' | 'dingtalk' | 'wechat_work' | 'github' | 'gitlab' | 'jira' | 'custom';
  name: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  last_sync_at?: string;
  status: 'connected' | 'disconnected' | 'error';
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationRequest {
  type: Integration['type'];
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateIntegrationRequest {
  name?: string;
  config?: Record<string, unknown>;
  is_enabled?: boolean;
}

export interface Webhook {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  delivery_count: number;
  failure_count: number;
  last_delivery_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  is_active?: boolean;
}

export const tenantConfigApi = {
  // ==================== 租户设置 ====================

  getSettings: async (tenantId: string): Promise<ApiResponse<TenantSettingsFull>> => {
    return apiClient.core.get(`/tenant/${tenantId}/settings`);
  },

  updateSettings: async (
    tenantId: string,
    data: Partial<TenantSettingsFull>
  ): Promise<ApiResponse<TenantSettingsFull>> => {
    return apiClient.core.put(`/tenant/${tenantId}/settings`, data);
  },

  // ==================== 品牌定制 ====================

  getBranding: async (tenantId: string): Promise<ApiResponse<BrandingSettings>> => {
    return apiClient.core.get(`/tenant/${tenantId}/branding`);
  },

  updateBranding: async (
    tenantId: string,
    data: Partial<BrandingSettings>
  ): Promise<ApiResponse<BrandingSettings>> => {
    return apiClient.core.put(`/tenant/${tenantId}/branding`, data);
  },

  // ==================== 功能开关 ====================

  listFeatures: async (tenantId: string): Promise<ApiResponse<TenantFeature[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/features`);
  },

  updateFeatures: async (
    tenantId: string,
    features: Record<string, boolean>
  ): Promise<ApiResponse<TenantFeature[]>> => {
    return apiClient.core.put(`/tenant/${tenantId}/features`, { features });
  },

  enableFeature: async (
    tenantId: string,
    feature: string
  ): Promise<ApiResponse<{ feature: string; enabled: boolean }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/features/${feature}/enable`);
  },

  disableFeature: async (
    tenantId: string,
    feature: string
  ): Promise<ApiResponse<{ feature: string; enabled: boolean }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/features/${feature}/disable`);
  },

  // ==================== 域名管理 ====================

  listDomains: async (tenantId: string): Promise<ApiResponse<TenantDomain[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/domains`);
  },

  addDomain: async (
    tenantId: string,
    data: CreateDomainRequest
  ): Promise<ApiResponse<TenantDomain>> => {
    return apiClient.core.post(`/tenant/${tenantId}/domains`, data);
  },

  removeDomain: async (tenantId: string, domain: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/domains/${domain}`);
  },

  // ==================== 邮件配置 ====================

  getEmailConfig: async (tenantId: string): Promise<ApiResponse<EmailSettings>> => {
    return apiClient.core.get(`/tenant/${tenantId}/email-config`);
  },

  updateEmailConfig: async (
    tenantId: string,
    data: UpdateEmailConfigRequest
  ): Promise<ApiResponse<EmailSettings>> => {
    return apiClient.core.put(`/tenant/${tenantId}/email-config`, data);
  },

  // ==================== 集成管理 ====================

  listIntegrations: async (
    tenantId: string,
    params?: { type?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResponse<Integration>>> => {
    return apiClient.core.get(`/tenant/${tenantId}/integrations`, { params });
  },

  createIntegration: async (
    tenantId: string,
    data: CreateIntegrationRequest
  ): Promise<ApiResponse<Integration>> => {
    return apiClient.core.post(`/tenant/${tenantId}/integrations`, data);
  },

  updateIntegration: async (
    tenantId: string,
    integrationId: string,
    data: UpdateIntegrationRequest
  ): Promise<ApiResponse<Integration>> => {
    return apiClient.core.put(`/tenant/${tenantId}/integrations/${integrationId}`, data);
  },

  deleteIntegration: async (
    tenantId: string,
    integrationId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/integrations/${integrationId}`);
  },

  // ==================== Webhook 管理 ====================

  listWebhooks: async (
    tenantId: string,
    params?: { is_active?: boolean }
  ): Promise<ApiResponse<PaginatedResponse<Webhook>>> => {
    return apiClient.core.get(`/tenant/${tenantId}/webhooks`, { params });
  },

  createWebhook: async (
    tenantId: string,
    data: CreateWebhookRequest
  ): Promise<ApiResponse<Webhook>> => {
    return apiClient.core.post(`/tenant/${tenantId}/webhooks`, data);
  },

  updateWebhook: async (
    tenantId: string,
    webhookId: string,
    data: UpdateWebhookRequest
  ): Promise<ApiResponse<Webhook>> => {
    return apiClient.core.put(`/tenant/${tenantId}/webhooks/${webhookId}`, data);
  },

  deleteWebhook: async (tenantId: string, webhookId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/webhooks/${webhookId}`);
  },

  testWebhook: async (
    tenantId: string,
    webhookId: string,
    data?: { event?: string; payload?: Record<string, unknown> }
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/webhooks/${webhookId}/test`, data || {});
  },
};

export default tenantConfigApi;
