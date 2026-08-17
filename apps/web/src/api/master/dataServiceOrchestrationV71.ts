import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ServiceStatus = 'draft' | 'published' | 'deprecated' | 'archived';
export type OrchestrationStatus = 'designing' | 'testing' | 'active' | 'inactive' | 'error';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type ServiceType =
  'integration' | 'transformation' | 'validation' | 'enrichment' | 'delivery';
export type DeploymentStatus = 'deploying' | 'active' | 'failed' | 'rolled_back';

export interface DataService {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  service_type: ServiceType;
  status: ServiceStatus;
  owner_id: string;
  endpoint?: string;
  version: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface OrchestrationFlow {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  status: OrchestrationStatus;
  trigger_type: 'manual' | 'scheduled' | 'event' | 'api';
  schedule?: string;
  nodes: Array<{
    id: string;
    type: 'source' | 'transform' | 'target' | 'condition' | 'parallel';
    service_id?: string;
    name: string;
    configuration?: Record<string, unknown>;
    depends_on?: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    condition?: string;
  }>;
  variables?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
}

export interface ServiceExecution {
  id: string;
  flow_id: string;
  service_id?: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  started_by?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number;
  triggered_by: 'manual' | 'scheduled' | 'event';
}

export interface ServiceLog {
  id: string;
  execution_id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  node_id?: string;
  timestamp: string;
}

export interface ServiceVersion {
  id: string;
  service_id: string;
  version: string;
  changelog: string;
  is_current: boolean;
  configuration: Record<string, unknown>;
  published_at: string;
}

export interface ServiceDeployment {
  id: string;
  service_id: string;
  version_id: string;
  environment: 'development' | 'staging' | 'production';
  status: DeploymentStatus;
  deployed_at?: string;
  rolled_back_at?: string;
  deployment_log?: string[];
}

export interface ServiceDashboard {
  total_services: number;
  published_services: number;
  active_flows: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time_ms: number;
  last_executions: ServiceExecution[];
  service_type_distribution: Record<ServiceType, number>;
  top_services: Array<{ service_id: string; execution_count: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateServiceRequest {
  name: string;
  description: string;
  service_type: ServiceType;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  status?: ServiceStatus;
}

export interface CreateOrchestrationRequest {
  name: string;
  description: string;
  trigger_type: 'manual' | 'scheduled' | 'event' | 'api';
  schedule?: string;
  nodes: OrchestrationFlow['nodes'];
  edges: OrchestrationFlow['edges'];
  variables?: Record<string, unknown>;
}

export interface UpdateOrchestrationRequest {
  name?: string;
  description?: string;
  trigger_type?: 'manual' | 'scheduled' | 'event' | 'api';
  schedule?: string;
  nodes?: OrchestrationFlow['nodes'];
  edges?: OrchestrationFlow['edges'];
  variables?: Record<string, unknown>;
  status?: OrchestrationStatus;
}

export interface ExecuteFlowRequest {
  input_data?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

export interface DeployServiceRequest {
  version_id: string;
  environment: 'development' | 'staging' | 'production';
}

// ============ API ============

export const dataServiceOrchestrationApiV71 = {
  // ===== 服务定义管理 =====
  async createService(data: CreateServiceRequest): Promise<ApiResponse<DataService>> {
    return apiClient.master.post<DataService>('/mdm-v71/services', data);
  },

  async getService(id: string): Promise<ApiResponse<DataService>> {
    return apiClient.master.get<DataService>(`/mdm-v71/services/${id}`);
  },

  async listServices(params?: {
    serviceType?: ServiceType;
    status?: ServiceStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataService>>> {
    const qs = new URLSearchParams();
    if (params?.serviceType) qs.set('service_type', params.serviceType);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataService>>(
      `/mdm-v71/services${s ? `?${s}` : ''}`
    );
  },

  async updateService(id: string, data: UpdateServiceRequest): Promise<ApiResponse<DataService>> {
    return apiClient.master.put<DataService>(`/mdm-v71/services/${id}`, data);
  },

  async removeService(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v71/services/${id}`);
  },

  async publishService(id: string): Promise<ApiResponse<DataService>> {
    return apiClient.master.post<DataService>(`/mdm-v71/services/${id}/publish`, {});
  },

  // ===== 编排流程管理 =====
  async createOrchestration(
    data: CreateOrchestrationRequest
  ): Promise<ApiResponse<OrchestrationFlow>> {
    return apiClient.master.post<OrchestrationFlow>('/mdm-v71/orchestrations', data);
  },

  async getOrchestration(id: string): Promise<ApiResponse<OrchestrationFlow>> {
    return apiClient.master.get<OrchestrationFlow>(`/mdm-v71/orchestrations/${id}`);
  },

  async listOrchestrations(params?: {
    status?: OrchestrationStatus;
    triggerType?: 'manual' | 'scheduled' | 'event' | 'api';
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<OrchestrationFlow>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.triggerType) qs.set('trigger_type', params.triggerType);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<OrchestrationFlow>>(
      `/mdm-v71/orchestrations${s ? `?${s}` : ''}`
    );
  },

  async updateOrchestration(
    id: string,
    data: UpdateOrchestrationRequest
  ): Promise<ApiResponse<OrchestrationFlow>> {
    return apiClient.master.put<OrchestrationFlow>(`/mdm-v71/orchestrations/${id}`, data);
  },

  async removeOrchestration(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v71/orchestrations/${id}`);
  },

  async activateOrchestration(id: string): Promise<ApiResponse<OrchestrationFlow>> {
    return apiClient.master.post<OrchestrationFlow>(`/mdm-v71/orchestrations/${id}/activate`, {});
  },

  async deactivateOrchestration(id: string): Promise<ApiResponse<OrchestrationFlow>> {
    return apiClient.master.post<OrchestrationFlow>(`/mdm-v71/orchestrations/${id}/deactivate`, {});
  },

  // ===== 服务执行/作业管理 =====
  async executeFlow(id: string, data?: ExecuteFlowRequest): Promise<ApiResponse<ServiceExecution>> {
    return apiClient.master.post<ServiceExecution>(
      `/mdm-v71/orchestrations/${id}/execute`,
      data || {}
    );
  },

  async getExecution(id: string): Promise<ApiResponse<ServiceExecution>> {
    return apiClient.master.get<ServiceExecution>(`/mdm-v71/executions/${id}`);
  },

  async listExecutions(params?: {
    flowId?: string;
    status?: ExecutionStatus;
    startedBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ServiceExecution>>> {
    const qs = new URLSearchParams();
    if (params?.flowId) qs.set('flow_id', params.flowId);
    if (params?.status) qs.set('status', params.status);
    if (params?.startedBy) qs.set('started_by', params.startedBy);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ServiceExecution>>(
      `/mdm-v71/executions${s ? `?${s}` : ''}`
    );
  },

  async cancelExecution(id: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    return apiClient.master.post<{ cancelled: boolean }>(`/mdm-v71/executions/${id}/cancel`, {});
  },

  async retryExecution(id: string): Promise<ApiResponse<ServiceExecution>> {
    return apiClient.master.post<ServiceExecution>(`/mdm-v71/executions/${id}/retry`, {});
  },

  // ===== 服务监控与日志 =====
  async listExecutionLogs(
    executionId: string,
    params?: {
      level?: 'info' | 'warning' | 'error' | 'debug';
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ServiceLog>>> {
    const qs = new URLSearchParams();
    if (params?.level) qs.set('level', params.level);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ServiceLog>>(
      `/mdm-v71/executions/${executionId}/logs${s ? `?${s}` : ''}`
    );
  },

  async getServiceMetrics(
    serviceId: string,
    params?: {
      period?: 'hour' | 'day' | 'week' | 'month';
    }
  ): Promise<
    ApiResponse<{
      service_id: string;
      total_calls: number;
      successful_calls: number;
      failed_calls: number;
      avg_duration_ms: number;
      p95_duration_ms: number;
      period_start: string;
      period_end: string;
    }>
  > {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    const s = qs.toString();
    return apiClient.master.get(`/mdm-v71/services/${serviceId}/metrics${s ? `?${s}` : ''}`);
  },

  // ===== 服务版本管理 =====
  async listServiceVersions(serviceId: string): Promise<ApiResponse<ServiceVersion[]>> {
    return apiClient.master.get<ServiceVersion[]>(`/mdm-v71/services/${serviceId}/versions`);
  },

  async createServiceVersion(
    serviceId: string,
    data: { changelog: string; configuration: Record<string, unknown> }
  ): Promise<ApiResponse<ServiceVersion>> {
    return apiClient.master.post<ServiceVersion>(`/mdm-v71/services/${serviceId}/versions`, data);
  },

  async setCurrentVersion(serviceId: string, versionId: string): Promise<ApiResponse<DataService>> {
    return apiClient.master.post<DataService>(
      `/mdm-v71/services/${serviceId}/versions/${versionId}/set-current`,
      {}
    );
  },

  // ===== 服务部署 =====
  async deployService(
    serviceId: string,
    data: DeployServiceRequest
  ): Promise<ApiResponse<ServiceDeployment>> {
    return apiClient.master.post<ServiceDeployment>(
      `/mdm-v71/services/${serviceId}/deployments`,
      data
    );
  },

  async listDeployments(serviceId: string): Promise<ApiResponse<ServiceDeployment[]>> {
    return apiClient.master.get<ServiceDeployment[]>(`/mdm-v71/services/${serviceId}/deployments`);
  },

  async rollbackDeployment(deploymentId: string): Promise<ApiResponse<ServiceDeployment>> {
    return apiClient.master.post<ServiceDeployment>(
      `/mdm-v71/deployments/${deploymentId}/rollback`,
      {}
    );
  },

  // ===== 仪表盘 =====
  async getDashboard(): Promise<ApiResponse<ServiceDashboard>> {
    return apiClient.master.get<ServiceDashboard>('/mdm-v71/dashboard');
  },

  async getFlowStatistics(flowId: string): Promise<
    ApiResponse<{
      flow_id: string;
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
      avg_duration_ms: number;
      last_execution_at?: string;
    }>
  > {
    return apiClient.master.get(`/mdm-v71/orchestrations/${flowId}/statistics`);
  },
};

export default dataServiceOrchestrationApiV71;
