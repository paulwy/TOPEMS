/**
 * Tenant · 租户安全管理 API 绑定
 *
 * 后端: svc/unified-core/src/modules/tenant_security.rs
 * 路由:
 *   GET    /tenant/{id}/security
 *   PUT    /tenant/{id}/security
 *   GET    /tenant/{id}/security/policies
 *   POST   /tenant/{id}/security/password-policy
 *   GET    /tenant/{id}/security/password-policy
 *   PUT    /tenant/{id}/security/password-policy
 *   POST   /tenant/{id}/security/enable-2fa
 *   POST   /tenant/{id}/security/disable-2fa
 *   POST   /tenant/{id}/security/generate-api-key
 *   DELETE /tenant/{id}/security/api-keys/{key_id}
 *   GET    /tenant/{id}/security/api-keys
 *   POST   /tenant/{id}/security/rotate-api-key/{key_id}
 *   GET    /tenant/{id}/security/audit-logs
 *   GET    /tenant/{id}/security/audit-logs/{id}
 *   POST   /tenant/{id}/security/audit-logs/export
 *   GET    /tenant/{id}/security/sessions
 *   POST   /tenant/{id}/security/sessions/{id}/revoke
 *   POST   /tenant/{id}/security/sessions/revoke-all
 *   POST   /tenant/{id}/security/ip-whitelist
 *   DELETE /tenant/{id}/security/ip-whitelist/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface TenantSecurity {
  id: string;
  tenant_id: string;
  sso_enabled: boolean;
  sso_provider?: 'saml' | 'oidc' | 'cas';
  sso_config?: SsoConfig;
  two_factor_enabled: boolean;
  two_factor_enforcement: 'optional' | 'required' | 'admin_only';
  two_factor_methods: Array<'totp' | 'sms' | 'email' | 'backup_codes'>;
  ip_whitelist_enabled: boolean;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  password_expiry_days: number;
  password_history_count: number;
  require_strong_passwords: boolean;
  failed_login_lockout_threshold: number;
  failed_login_lockout_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface SsoConfig {
  provider: 'saml' | 'oidc' | 'cas';
  entity_id?: string;
  sso_url?: string;
  slo_url?: string;
  certificate?: string;
  client_id?: string;
  client_secret?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string[];
  attribute_mapping?: Record<string, string>;
}

export interface PasswordPolicy {
  id: string;
  tenant_id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  expiry_days: number;
  history_count: number;
  prevent_reuse: boolean;
  lockout_threshold: number;
  lockout_minutes: number;
  updated_at: string;
}

export interface CreatePasswordPolicyRequest {
  min_length: number;
  require_uppercase?: boolean;
  require_lowercase?: boolean;
  require_numbers?: boolean;
  require_special_chars?: boolean;
  expiry_days?: number;
  history_count?: number;
  prevent_reuse?: boolean;
  lockout_threshold?: number;
  lockout_minutes?: number;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  key_hash?: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export interface GenerateApiKeyRequest {
  name: string;
  scopes?: string[];
  expires_at?: string;
}

export interface GenerateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  expires_at?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  event_type:
    | 'login'
    | 'logout'
    | 'password_change'
    | 'api_key_create'
    | 'api_key_delete'
    | 'permission_change'
    | 'data_access'
    | 'config_change';
  severity: 'info' | 'warning' | 'error' | 'critical';
  actor: string;
  actor_type: 'user' | 'api_key' | 'system';
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  device_type?: string;
  location?: string;
  is_current: boolean;
  last_activity_at: string;
  expires_at: string;
  created_at: string;
}

export interface IpWhitelistEntry {
  id: string;
  tenant_id: string;
  ip_address: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateIpWhitelistRequest {
  ip_address: string;
  description?: string;
}

export const tenantSecurityApi = {
  // ==================== 安全设置 ====================

  getSecuritySettings: async (tenantId: string): Promise<ApiResponse<TenantSecurity>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security`);
  },

  updateSecuritySettings: async (
    tenantId: string,
    data: Partial<TenantSecurity>
  ): Promise<ApiResponse<TenantSecurity>> => {
    return apiClient.core.put(`/tenant/${tenantId}/security`, data);
  },

  // ==================== 密码策略 ====================

  getPasswordPolicy: async (tenantId: string): Promise<ApiResponse<PasswordPolicy>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security/password-policy`);
  },

  updatePasswordPolicy: async (
    tenantId: string,
    data: CreatePasswordPolicyRequest
  ): Promise<ApiResponse<PasswordPolicy>> => {
    return apiClient.core.put(`/tenant/${tenantId}/security/password-policy`, data);
  },

  // ==================== 双因子认证 ====================

  enable2FA: async (
    tenantId: string,
    data: {
      enforcement?: 'optional' | 'required' | 'admin_only';
      methods?: Array<'totp' | 'sms' | 'email'>;
    }
  ): Promise<ApiResponse<{ enabled: boolean }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/enable-2fa`, data);
  },

  disable2FA: async (tenantId: string): Promise<ApiResponse<{ disabled: boolean }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/disable-2fa`);
  },

  // ==================== API Key 管理 ====================

  listApiKeys: async (tenantId: string): Promise<ApiResponse<ApiKey[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security/api-keys`);
  },

  generateApiKey: async (
    tenantId: string,
    data: GenerateApiKeyRequest
  ): Promise<ApiResponse<GenerateApiKeyResponse>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/generate-api-key`, data);
  },

  rotateApiKey: async (
    tenantId: string,
    keyId: string
  ): Promise<ApiResponse<GenerateApiKeyResponse>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/rotate-api-key/${keyId}`);
  },

  deleteApiKey: async (tenantId: string, keyId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/security/api-keys/${keyId}`);
  },

  // ==================== 审计日志 ====================

  listAuditLogs: async (
    tenantId: string,
    params?: {
      event_type?: AuditLog['event_type'];
      severity?: AuditLog['severity'];
      actor?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security/audit-logs`, { params });
  },

  getAuditLog: async (tenantId: string, logId: string): Promise<ApiResponse<AuditLog>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security/audit-logs/${logId}`);
  },

  exportAuditLogs: async (
    tenantId: string,
    data?: {
      event_type?: string;
      start_date?: string;
      end_date?: string;
      format?: 'csv' | 'json';
    }
  ): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/audit-logs/export`, data || {});
  },

  // ==================== 会话管理 ====================

  listSessions: async (tenantId: string): Promise<ApiResponse<Session[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/security/sessions`);
  },

  revokeSession: async (tenantId: string, sessionId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/sessions/${sessionId}/revoke`);
  },

  revokeAllSessions: async (tenantId: string): Promise<ApiResponse<{ revoked: number }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/sessions/revoke-all`);
  },

  // ==================== IP 白名单 ====================

  addIpWhitelist: async (
    tenantId: string,
    data: CreateIpWhitelistRequest
  ): Promise<ApiResponse<IpWhitelistEntry>> => {
    return apiClient.core.post(`/tenant/${tenantId}/security/ip-whitelist`, data);
  },

  removeIpWhitelist: async (tenantId: string, ipId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/security/ip-whitelist/${ipId}`);
  },
};

export default tenantSecurityApi;
