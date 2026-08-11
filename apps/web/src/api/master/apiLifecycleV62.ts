import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ApiType = 'rest' | 'graphql' | 'grpc' | 'event';
export type LifecycleStageV62 = 'design' | 'development' | 'staging' | 'production' | 'deprecated' | 'retired';
export type ApiStatusV62 = 'active' | 'testing' | 'paused' | 'archived';

export interface ApiEndpointV62 {
  id: string;
  name: string;
  type: ApiType;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  version: string;
  stage: LifecycleStageV62;
  status: ApiStatusV62;
  owner?: string;
  service: string;
  description?: string;
  created_at: string;
  updated_at: string;
  retired_at?: string;
  spec?: Record<string, unknown>;
}

export interface ApiVersionInfoV62 {
  version: string;
  stage: LifecycleStageV62;
  deprecated_at?: string;
  sunsetted_at?: string;
  breaking_changes: string[];
  migration_guide?: string;
  is_recommended: boolean;
}

export interface ApiConsumption {
  id: string;
  api_id: string;
  consumer_service: string;
  consumer_team?: string;
  consumer_contact?: string;
  usage_last_30d: number;
  usage_last_7d: number;
  error_rate: number;
  sdk_available: boolean;
  since: string;
}

export interface ApiDeploymentV62 {
  id: string;
  api_id: string;
  environment: 'dev' | 'staging' | 'prod';
  version: string;
  deployed_at: string;
  deployed_by?: string;
  status: 'deploying' | 'active' | 'failed' | 'rollback';
  health?: {
    uptime: number;
    latency_p95_ms: number;
    error_rate: number;
  };
}

export interface ApiChangeLogV62 {
  id: string;
  api_id: string;
  version: string;
  change_type: 'breaking' | 'non_breaking' | 'feature' | 'deprecation' | 'fix';
  summary: string;
  details?: string;
  published_at: string;
  published_by?: string;
}

export interface ApiLifecycleDashboardV62 {
  total_apis: number;
  by_stage: Array<{ stage: LifecycleStageV62; count: number }>;
  by_status: Array<{ status: ApiStatusV62; count: number }>;
  by_type: Array<{ type: ApiType; count: number }>;
  deprecated_count: number;
  retired_count: number;
  active_consumers: number;
  breaking_changes_30d: number;
  pending_deprecations: number;
}

// ============ Request Types ============

export interface RegisterApiRequestV62 {
  name: string;
  type: ApiType;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  version?: string;
  service: string;
  owner?: string;
  description?: string;
  spec?: Record<string, unknown>;
}

export interface UpdateApiRequestV62 {
  name?: string;
  description?: string;
  owner?: string;
  spec?: Record<string, unknown>;
}

export interface PromoteApiRequest {
  target_stage: LifecycleStageV62;
  changelog?: string;
}

export interface DeprecateApiRequest {
  reason: string;
  replacement_api_id?: string;
  sunset_date?: string;
}

export interface RetireApiRequest {
  confirmation: boolean;
  reason: string;
}

export interface CreateVersionRequest {
  version: string;
  changelog: string;
  breaking_changes?: string[];
  migration_guide?: string;
}

export interface DeployApiRequest {
  environment: 'dev' | 'staging' | 'prod';
  version: string;
}

// ============ API ============

export const apiLifecycleApiV62 = {
  // ===== API 注册与管理 =====
  async registerApi(data: RegisterApiRequestV62): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.post<ApiEndpointV62>('/mdm-v62/apis', data);
  },

  async getApi(id: string): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.get<ApiEndpointV62>(`/mdm-v62/apis/${id}`);
  },

  async listApis(params?: {
    stage?: LifecycleStageV62;
    status?: ApiStatusV62;
    type?: ApiType;
    service?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: ApiEndpointV62[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.service) qs.set('service', params.service);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: ApiEndpointV62[]; total: number }>(`/mdm-v62/apis${s ? `?${s}` : ''}`);
  },

  async updateApi(id: string, data: UpdateApiRequestV62): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.put<ApiEndpointV62>(`/mdm-v62/apis/${id}`, data);
  },

  async deleteApi(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v62/apis/${id}`);
  },

  // ===== 生命周期流转 =====
  async promoteApi(id: string, data: PromoteApiRequest): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.post<ApiEndpointV62>(`/mdm-v62/apis/${id}/promote`, data);
  },

  async deprecateApi(id: string, data: DeprecateApiRequest): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.post<ApiEndpointV62>(`/mdm-v62/apis/${id}/deprecate`, data);
  },

  async retireApi(id: string, data: RetireApiRequest): Promise<ApiResponse<{ retired: boolean }>> {
    return apiClient.master.post<{ retired: boolean }>(`/mdm-v62/apis/${id}/retire`, data);
  },

  async restoreApi(id: string): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.post<ApiEndpointV62>(`/mdm-v62/apis/${id}/restore`, {});
  },

  async getStageHistory(id: string): Promise<ApiResponse<Array<{ stage: LifecycleStageV62; action: string; at: string; by?: string }>>> {
    return apiClient.master.get<Array<{ stage: LifecycleStageV62; action: string; at: string; by?: string }>>(`/mdm-v62/apis/${id}/history`);
  },

  // ===== 版本管理 =====
  async listVersions(id: string): Promise<ApiResponse<ApiVersionInfoV62[]>> {
    return apiClient.master.get<ApiVersionInfoV62[]>(`/mdm-v62/apis/${id}/versions`);
  },

  async createVersion(id: string, data: CreateVersionRequest): Promise<ApiResponse<ApiVersionInfoV62>> {
    return apiClient.master.post<ApiVersionInfoV62>(`/mdm-v62/apis/${id}/versions`, data);
  },

  async getVersion(id: string, version: string): Promise<ApiResponse<ApiEndpointV62>> {
    return apiClient.master.get<ApiEndpointV62>(`/mdm-v62/apis/${id}/versions/${version}`);
  },

  async setRecommendedVersion(id: string, version: string): Promise<ApiResponse<ApiVersionInfoV62>> {
    return apiClient.master.post<ApiVersionInfoV62>(`/mdm-v62/apis/${id}/recommend`, { version });
  },

  // ===== 部署管理 =====
  async listDeployments(apiId: string): Promise<ApiResponse<ApiDeploymentV62[]>> {
    return apiClient.master.get<ApiDeploymentV62[]>(`/mdm-v62/apis/${apiId}/deployments`);
  },

  async deployApi(apiId: string, data: DeployApiRequest): Promise<ApiResponse<ApiDeploymentV62>> {
    return apiClient.master.post<ApiDeploymentV62>(`/mdm-v62/apis/${apiId}/deploy`, data);
  },

  async rollbackDeployment(apiId: string, deploymentId: string): Promise<ApiResponse<ApiDeploymentV62>> {
    return apiClient.master.post<ApiDeploymentV62>(`/mdm-v62/apis/${apiId}/rollback/${deploymentId}`, {});
  },

  async getDeploymentHealth(apiId: string, environment: string): Promise<ApiResponse<ApiDeploymentV62['health']>> {
    return apiClient.master.get<ApiDeploymentV62['health']>(`/mdm-v62/apis/${apiId}/health/${environment}`);
  },

  // ===== 消费方管理 =====
  async listConsumers(apiId: string): Promise<ApiResponse<ApiConsumption[]>> {
    return apiClient.master.get<ApiConsumption[]>(`/mdm-v62/apis/${apiId}/consumers`);
  },

  async registerConsumer(apiId: string, data: {
    consumer_service: string;
    consumer_team?: string;
    consumer_contact?: string;
  }): Promise<ApiResponse<ApiConsumption>> {
    return apiClient.master.post<ApiConsumption>(`/mdm-v62/apis/${apiId}/consumers`, data);
  },

  async unregisterConsumer(apiId: string, consumerId: string): Promise<ApiResponse<{ unregistered: boolean }>> {
    return apiClient.master.delete<{ unregistered: boolean }>(`/mdm-v62/apis/${apiId}/consumers/${consumerId}`);
  },

  async getConsumerUsage(apiId: string, consumerId: string): Promise<ApiResponse<ApiConsumption>> {
    return apiClient.master.get<ApiConsumption>(`/mdm-v62/apis/${apiId}/consumers/${consumerId}/usage`);
  },

  // ===== 变更日志与仪表盘 =====
  async listChangeLogs(params?: {
    api_id?: string;
    change_type?: ApiChangeLogV62['change_type'];
    published_since?: string;
  }): Promise<ApiResponse<ApiChangeLogV62[]>> {
    const qs = new URLSearchParams();
    if (params?.api_id) qs.set('api_id', params.api_id);
    if (params?.change_type) qs.set('change_type', params.change_type);
    if (params?.published_since) qs.set('since', params.published_since);
    const s = qs.toString();
    return apiClient.master.get<ApiChangeLogV62[]>(`/mdm-v62/changelog${s ? `?${s}` : ''}`);
  },

  async getDashboard(): Promise<ApiResponse<ApiLifecycleDashboardV62>> {
    return apiClient.master.get<ApiLifecycleDashboardV62>('/mdm-v62/dashboard');
  },

  async listServiceApis(service: string): Promise<ApiResponse<ApiEndpointV62[]>> {
    return apiClient.master.get<ApiEndpointV62[]>(`/mdm-v62/services/${service}/apis`);
  },

  async getDeprecationCandidates(daysThreshold?: number): Promise<ApiResponse<ApiEndpointV62[]>> {
    const qs = new URLSearchParams();
    if (daysThreshold !== undefined) qs.set('days', String(daysThreshold));
    const s = qs.toString();
    return apiClient.master.get<ApiEndpointV62[]>(`/mdm-v62/deprecation-candidates${s ? `?${s}` : ''}`);
  },
};

export default apiLifecycleApiV62;
