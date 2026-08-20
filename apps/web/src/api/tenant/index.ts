import type { ApiResponse } from '../client';
import apiClient from '../client';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  UsageMetrics,
  TenantBillingInfo,
  TenantInvoice,
  CreateTenantRequest,
  UpdateTenantRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  TenantContext,
} from './types';
import { tenantConfigApi } from './config';
import { tenantSecurityApi } from './security';
import { tenantAnalyticsApi } from './analytics';

const API_BASE = '/tenant';

export const tenantApi = {
  // ==================== 基础 CRUD ====================

  listTenants: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    plan?: string;
  }): Promise<ApiResponse<{ items: Tenant[]; total: number; page: number; pageSize: number }>> => {
    return apiClient.core.get(`${API_BASE}/list`, { params });
  },

  getTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}`);
  },

  getTenantBySlug: async (slug: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.get(`${API_BASE}/slug/${slug}`);
  },

  createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/create`, data);
  },

  updateTenant: async (
    tenantId: string,
    data: UpdateTenantRequest
  ): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.put(`${API_BASE}/${tenantId}`, data);
  },

  deleteTenant: async (tenantId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`${API_BASE}/${tenantId}`);
  },

  activateTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/activate`);
  },

  suspendTenant: async (tenantId: string): Promise<ApiResponse<Tenant>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/suspend`);
  },

  // ==================== 成员管理 ====================

  getTenantUsers: async (
    tenantId: string,
    params?: {
      page?: number;
      pageSize?: number;
      search?: string;
      role?: string;
      status?: string;
    }
  ): Promise<
    ApiResponse<{ items: TenantUser[]; total: number; page: number; pageSize: number }>
  > => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/users`, { params });
  },

  inviteMember: async (
    tenantId: string,
    data: InviteMemberRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.post(`${API_BASE}/${tenantId}/users/invite`, data);
  },

  removeMember: async (tenantId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`${API_BASE}/${tenantId}/users/${userId}`);
  },

  updateMemberRole: async (
    tenantId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<ApiResponse<TenantUser>> => {
    return apiClient.core.put(`${API_BASE}/${tenantId}/users/${userId}/role`, data);
  },

  // ==================== 统计与账单 ====================

  getTenantStats: async (tenantId: string): Promise<ApiResponse<TenantStats>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/stats`);
  },

  getUsageMetrics: async (tenantId: string): Promise<ApiResponse<UsageMetrics>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/usage`);
  },

  getBillingInfo: async (tenantId: string): Promise<ApiResponse<TenantBillingInfo>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/billing`);
  },

  getInvoices: async (tenantId: string): Promise<ApiResponse<TenantInvoice[]>> => {
    return apiClient.core.get(`${API_BASE}/${tenantId}/invoices`);
  },

  // ==================== 上下文 ====================

  getCurrentTenantContext: async (): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.get(`${API_BASE}/context`);
  },

  getMyTenants: async (): Promise<ApiResponse<Tenant[]>> => {
    return apiClient.core.get(`${API_BASE}/my`);
  },

  switchTenant: async (tenantId: string): Promise<ApiResponse<TenantContext>> => {
    return apiClient.core.post(`${API_BASE}/switch`, { tenant_id: tenantId });
  },

  // ==================== 子模块聚合 ====================

  /** 租户配置管理（设置、品牌、功能开关、域名、邮件、集成、Webhook） */
  config: tenantConfigApi,

  /** 租户安全管理（安全设置、密码策略、2FA、API Key、审计日志、会话、IP 白名单） */
  security: tenantSecurityApi,

  /** 租户分析与账单（概览、使用、API 分析、用户统计、实时监控、订阅、发票） */
  analytics: tenantAnalyticsApi,

  // ==================== 顶层快捷方法 ====================

  // Config 快捷方法
  getSettings: tenantConfigApi.getSettings,
  updateSettings: tenantConfigApi.updateSettings,
  getBranding: tenantConfigApi.getBranding,
  updateBranding: tenantConfigApi.updateBranding,
  listFeatures: tenantConfigApi.listFeatures,
  enableFeature: tenantConfigApi.enableFeature,
  disableFeature: tenantConfigApi.disableFeature,
  listDomains: tenantConfigApi.listDomains,
  addDomain: tenantConfigApi.addDomain,
  listIntegrations: tenantConfigApi.listIntegrations,
  listWebhooks: tenantConfigApi.listWebhooks,
  createWebhook: tenantConfigApi.createWebhook,

  // Security 快捷方法
  getSecuritySettings: tenantSecurityApi.getSecuritySettings,
  updateSecuritySettings: tenantSecurityApi.updateSecuritySettings,
  getPasswordPolicy: tenantSecurityApi.getPasswordPolicy,
  enable2FA: tenantSecurityApi.enable2FA,
  disable2FA: tenantSecurityApi.disable2FA,
  listApiKeys: tenantSecurityApi.listApiKeys,
  generateApiKey: tenantSecurityApi.generateApiKey,
  listAuditLogs: tenantSecurityApi.listAuditLogs,
  listSessions: tenantSecurityApi.listSessions,

  // Analytics 快捷方法
  getOverview: tenantAnalyticsApi.getOverview,
  getUsage: tenantAnalyticsApi.getUsage,
  getApiUsageStats: tenantAnalyticsApi.getApiUsageStats,
  getRealTimeMetrics: tenantAnalyticsApi.getRealTimeMetrics,
  getSubscription: tenantAnalyticsApi.getSubscription,
  listInvoices: tenantAnalyticsApi.listInvoices,
  changePlan: tenantAnalyticsApi.changePlan,
};

export default tenantApi;
export { tenantConfigApi, tenantAnalyticsApi };
// Config types
export type {
  TenantSettingsFull,
  GeneralSettings,
  BrandingSettings,
  EmailSettings,
  IntegrationSettings,
  TenantFeature,
  TenantDomain,
  CreateDomainRequest,
  UpdateEmailConfigRequest,
  Integration,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
} from './config';

// Security types
export type {
  TenantSecurity,
  SsoConfig,
  PasswordPolicy,
  CreatePasswordPolicyRequest,
  ApiKey,
  GenerateApiKeyRequest,
  GenerateApiKeyResponse,
  AuditLog,
  Session,
  IpWhitelistEntry,
  CreateIpWhitelistRequest,
} from './security';

// Analytics types
export type {
  AnalyticsOverview,
  UsageData,
  ActivityEvent,
  ApiUsageStats,
  TopEndpoint,
  UserStats,
  RealTimeMetrics,
  BillingSubscription,
  BillingInvoice,
  PaymentMethod,
  ChangePlanRequest,
} from './analytics';
