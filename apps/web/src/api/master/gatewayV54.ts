import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type RouteStatus = 'active' | 'inactive' | 'deprecated';
export type RateLimitType = 'fixed_window' | 'token_bucket' | 'leaky_bucket';
export type AuthType = 'api_key' | 'oauth2' | 'jwt' | 'basic';
export type DeveloperStatus = 'active' | 'pending' | 'disabled';
export type APIKeyStatus = 'active' | 'revoked' | 'expired';

export interface GatewayRoute {
  id: string;
  path: string;
  upstream: string;
  methods: string[];
  status: RouteStatus;
  auth_required: boolean;
  rate_limit_enabled: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitRule {
  id: string;
  route_id: string;
  limit_type: RateLimitType;
  limit_value: number;
  window_seconds: number;
  burst_size: number;
  enabled: boolean;
}

export interface AuthConfig {
  id: string;
  route_id: string;
  auth_type: AuthType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface APILog {
  id: string;
  route_id: string;
  developer_id: string;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  request_size: number;
  response_size: number;
  ip_address: string;
  timestamp: string;
}

export interface Developer {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  status: DeveloperStatus;
  company?: string;
  created_at: string;
  last_active_at?: string;
}

export interface APIKey {
  id: string;
  developer_id: string;
  name: string;
  key_prefix: string;
  status: APIKeyStatus;
  rate_limit_per_min: number;
  rate_limit_per_day: number;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export interface UsageStats {
  developer_id: string;
  total_requests: number;
  total_errors: number;
  total_response_time_ms: number;
  avg_response_time_ms: number;
  error_rate: number;
  period_start: string;
  period_end: string;
}

export interface GatewayDashboard {
  total_routes: number;
  active_routes: number;
  total_developers: number;
  active_developers: number;
  total_api_keys: number;
  active_api_keys: number;
  requests_last_24h: number;
  errors_last_24h: number;
  avg_latency_ms: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateRouteRequest {
  path: string;
  upstream: string;
  methods?: string[];
  description?: string;
}

export interface UpdateRouteRequest {
  upstream?: string;
  methods?: string[];
  description?: string;
  status?: RouteStatus;
}

export interface CreateRateLimitRuleRequest {
  route_id: string;
  limit_type: RateLimitType;
  limit_value: number;
  window_seconds: number;
  burst_size?: number;
}

export interface CreateAuthConfigRequest {
  route_id: string;
  auth_type: AuthType;
  config: Record<string, unknown>;
}

export interface CreateDeveloperRequest {
  tenant_id: string;
  name: string;
  email: string;
  company?: string;
}

export interface CreateAPIKeyRequest {
  developer_id: string;
  name: string;
  rate_limit_per_min?: number;
  rate_limit_per_day?: number;
  expires_at?: string;
}

export interface LogsQueryParams {
  route_id?: string;
  developer_id?: string;
  method?: string;
  status_code?: number;
  start_time?: string;
  end_time?: string;
  page?: number;
  pageSize?: number;
}

// ============ API ============

export const gatewayApiV54 = {
  // ===== API 路由管理 =====
  async createRoute(data: CreateRouteRequest): Promise<ApiResponse<GatewayRoute>> {
    return apiClient.master.post<GatewayRoute>('/mdm-v54/routes', data);
  },

  async getRoute(id: string): Promise<ApiResponse<GatewayRoute>> {
    return apiClient.master.get<GatewayRoute>(`/mdm-v54/routes/${id}`);
  },

  async listRoutes(params?: {
    status?: RouteStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<GatewayRoute>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<GatewayRoute>>(`/mdm-v54/routes${s ? `?${s}` : ''}`);
  },

  async updateRoute(id: string, data: UpdateRouteRequest): Promise<ApiResponse<GatewayRoute>> {
    return apiClient.master.put<GatewayRoute>(`/mdm-v54/routes/${id}`, data);
  },

  async deleteRoute(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v54/routes/${id}`);
  },

  async enableRoute(id: string): Promise<ApiResponse<GatewayRoute>> {
    return apiClient.master.patch<GatewayRoute>(`/mdm-v54/routes/${id}/enable`, {});
  },

  async disableRoute(id: string): Promise<ApiResponse<GatewayRoute>> {
    return apiClient.master.patch<GatewayRoute>(`/mdm-v54/routes/${id}/disable`, {});
  },

  // ===== 限流规则管理 =====
  async createRateLimitRule(data: CreateRateLimitRuleRequest): Promise<ApiResponse<RateLimitRule>> {
    return apiClient.master.post<RateLimitRule>('/mdm-v54/rate-limits', data);
  },

  async getRateLimitRule(id: string): Promise<ApiResponse<RateLimitRule>> {
    return apiClient.master.get<RateLimitRule>(`/mdm-v54/rate-limits/${id}`);
  },

  async listRateLimitRules(routeId?: string): Promise<ApiResponse<RateLimitRule[]>> {
    const qs = new URLSearchParams();
    if (routeId) qs.set('route_id', routeId);
    const s = qs.toString();
    return apiClient.master.get<RateLimitRule[]>(`/mdm-v54/rate-limits${s ? `?${s}` : ''}`);
  },

  async updateRateLimitRule(id: string, data: Partial<CreateRateLimitRuleRequest>): Promise<ApiResponse<RateLimitRule>> {
    return apiClient.master.put<RateLimitRule>(`/mdm-v54/rate-limits/${id}`, data);
  },

  async deleteRateLimitRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v54/rate-limits/${id}`);
  },

  // ===== 认证配置管理 =====
  async createAuthConfig(data: CreateAuthConfigRequest): Promise<ApiResponse<AuthConfig>> {
    return apiClient.master.post<AuthConfig>('/mdm-v54/auth-configs', data);
  },

  async getAuthConfig(id: string): Promise<ApiResponse<AuthConfig>> {
    return apiClient.master.get<AuthConfig>(`/mdm-v54/auth-configs/${id}`);
  },

  async listAuthConfigs(routeId?: string): Promise<ApiResponse<AuthConfig[]>> {
    const qs = new URLSearchParams();
    if (routeId) qs.set('route_id', routeId);
    const s = qs.toString();
    return apiClient.master.get<AuthConfig[]>(`/mdm-v54/auth-configs${s ? `?${s}` : ''}`);
  },

  async updateAuthConfig(id: string, data: Partial<CreateAuthConfigRequest>): Promise<ApiResponse<AuthConfig>> {
    return apiClient.master.put<AuthConfig>(`/mdm-v54/auth-configs/${id}`, data);
  },

  async deleteAuthConfig(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v54/auth-configs/${id}`);
  },

  // ===== API 日志查询 =====
  async listLogs(params?: LogsQueryParams): Promise<ApiResponse<PaginatedResponse<APILog>>> {
    const qs = new URLSearchParams();
    if (params?.route_id) qs.set('route_id', params.route_id);
    if (params?.developer_id) qs.set('developer_id', params.developer_id);
    if (params?.method) qs.set('method', params.method);
    if (params?.status_code !== undefined) qs.set('status_code', String(params.status_code));
    if (params?.start_time) qs.set('start_time', params.start_time);
    if (params?.end_time) qs.set('end_time', params.end_time);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<APILog>>(`/mdm-v54/logs${s ? `?${s}` : ''}`);
  },

  async getLog(id: string): Promise<ApiResponse<APILog>> {
    return apiClient.master.get<APILog>(`/mdm-v54/logs/${id}`);
  },

  // ===== 开发者管理 =====
  async createDeveloper(data: CreateDeveloperRequest): Promise<ApiResponse<Developer>> {
    return apiClient.master.post<Developer>('/mdm-v54/developers', data);
  },

  async getDeveloper(id: string): Promise<ApiResponse<Developer>> {
    return apiClient.master.get<Developer>(`/mdm-v54/developers/${id}`);
  },

  async listDevelopers(params?: {
    tenant_id?: string;
    status?: DeveloperStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Developer>>> {
    const qs = new URLSearchParams();
    if (params?.tenant_id) qs.set('tenant_id', params.tenant_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<Developer>>(`/mdm-v54/developers${s ? `?${s}` : ''}`);
  },

  async updateDeveloper(id: string, data: Partial<CreateDeveloperRequest>): Promise<ApiResponse<Developer>> {
    return apiClient.master.put<Developer>(`/mdm-v54/developers/${id}`, data);
  },

  async deleteDeveloper(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v54/developers/${id}`);
  },

  async activateDeveloper(id: string): Promise<ApiResponse<Developer>> {
    return apiClient.master.patch<Developer>(`/mdm-v54/developers/${id}/activate`, {});
  },

  async disableDeveloper(id: string): Promise<ApiResponse<Developer>> {
    return apiClient.master.patch<Developer>(`/mdm-v54/developers/${id}/disable`, {});
  },

  // ===== API Key 管理 =====
  async createAPIKey(data: CreateAPIKeyRequest): Promise<ApiResponse<APIKey & { key: string }>> {
    return apiClient.master.post<APIKey & { key: string }>('/mdm-v54/api-keys', data);
  },

  async listAPIKeys(developerId?: string): Promise<ApiResponse<APIKey[]>> {
    const qs = new URLSearchParams();
    if (developerId) qs.set('developer_id', developerId);
    const s = qs.toString();
    return apiClient.master.get<APIKey[]>(`/mdm-v54/api-keys${s ? `?${s}` : ''}`);
  },

  async revokeAPIKey(id: string): Promise<ApiResponse<APIKey>> {
    return apiClient.master.patch<APIKey>(`/mdm-v54/api-keys/${id}/revoke`, {});
  },

  async rotateAPIKey(id: string): Promise<ApiResponse<APIKey & { new_key: string }>> {
    return apiClient.master.post<APIKey & { new_key: string }>(`/mdm-v54/api-keys/${id}/rotate`, {});
  },

  async deleteAPIKey(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v54/api-keys/${id}`);
  },

  // ===== 使用统计 =====
  async getUsageStats(developerId: string, params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<ApiResponse<UsageStats>> {
    const qs = new URLSearchParams();
    if (params?.start_time) qs.set('start_time', params.start_time);
    if (params?.end_time) qs.set('end_time', params.end_time);
    const s = qs.toString();
    return apiClient.master.get<UsageStats>(`/mdm-v54/developers/${developerId}/usage${s ? `?${s}` : ''}`);
  },

  async getDashboard(): Promise<ApiResponse<GatewayDashboard>> {
    return apiClient.master.get<GatewayDashboard>('/mdm-v54/dashboard');
  },
};

export default gatewayApiV54;
