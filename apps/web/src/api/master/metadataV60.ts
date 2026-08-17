import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type MetadataType = 'table' | 'column' | 'entity' | 'field' | 'document' | 'report';
export type LifecycleStage =
  'design' | 'development' | 'testing' | 'production' | 'archive' | 'retire';
export type LifecycleStatus = 'active' | 'completed' | 'cancelled';

export interface MetadataV60 {
  id: string;
  name: string;
  type: MetadataType;
  description?: string;
  attributes: Array<{ key: string; value: string; type: 'string' | 'number' | 'boolean' | 'json' }>;
  tags: string[];
  owner?: string;
  created_at: string;
  updated_at: string;
}

export interface LineageNode {
  id: string;
  name: string;
  type: MetadataType;
  attributes?: Record<string, unknown>;
}

export interface LineageEdge {
  id: string;
  from: string;
  to: string;
  type: 'transforms' | 'depends_on' | 'derived_from' | 'references';
  confidence: number;
}

export interface LineageGraph {
  id: string;
  name: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
  created_at: string;
  updated_at: string;
}

export interface LineagePath {
  nodes: LineageNode[];
  edges: LineageEdge[];
  length: number;
  confidence: number;
}

export interface LineageImpact {
  entity_id: string;
  entity_name: string;
  downstream_count: number;
  affected_entities: Array<{
    id: string;
    name: string;
    type: MetadataType;
    impact_level: 'high' | 'medium' | 'low';
  }>;
  risk_score: number;
}

export interface LineageDashboard {
  total_entities: number;
  total_edges: number;
  by_type: Array<{ type: MetadataType; count: number }>;
  by_stage: Array<{ stage: LifecycleStage; count: number }>;
  top_connected: Array<{ id: string; name: string; connections: number; type: MetadataType }>;
  isolated_nodes: number;
  avg_connectivity: number;
  last_updated_at: string;
}

export interface LifecyclePolicy {
  id: string;
  name: string;
  entity_type: MetadataType;
  stages: Array<{
    stage: LifecycleStage;
    order: number;
    duration_days?: number;
    auto_transition?: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export interface LifecycleHistoryEntryV60 {
  stage: LifecycleStage;
  action: 'enter' | 'exit' | 'transition';
  from_stage?: LifecycleStage;
  to_stage?: LifecycleStage;
  performed_at: string;
  performed_by?: string;
  reason?: string;
}

export interface LifecycleDashboard {
  by_stage: Array<{ stage: LifecycleStage; count: number; avg_duration_days: number }>;
  by_entity_type: Array<{ type: MetadataType; total: number; active: number; completed: number }>;
  avg_transition_time_days: number;
  pending_transitions: number;
  policies_count: number;
}

// ============ Request Types ============

export interface CreateMetadataRequest {
  name: string;
  type: MetadataType;
  description?: string;
  attributes?: Array<{
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
  }>;
  tags?: string[];
  owner?: string;
}

export interface UpdateMetadataRequest {
  name?: string;
  description?: string;
  attributes?: Array<{
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
  }>;
  tags?: string[];
  owner?: string;
}

export interface SearchMetadataParams {
  query?: string;
  type?: MetadataType;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface AddAttributeRequest {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface AddTagRequest {
  tag: string;
  entity_ids?: string[];
}

export interface BuildLineageGraphRequest {
  entity_ids?: string[];
  depth?: number;
  include_types?: MetadataType[];
}

export interface GetPathRequest {
  from_id: string;
  to_id: string;
  max_depth?: number;
}

export interface TransitionStageRequest {
  to_stage: LifecycleStage;
  reason?: string;
  performed_by?: string;
}

export interface CreatePolicyRequest {
  name: string;
  entity_type: MetadataType;
  stages: Array<{
    stage: LifecycleStage;
    order: number;
    duration_days?: number;
    auto_transition?: boolean;
  }>;
}

export interface AutoTransitionRequest {
  entity_type?: MetadataType;
  entity_ids?: string[];
  dry_run?: boolean;
}

export interface BulkTransitionRequest {
  entity_ids: string[];
  to_stage: LifecycleStage;
  reason?: string;
}

// ============ API ============

export const metadataApiV60 = {
  // ===== 元数据管理 =====
  async createMetadata(data: CreateMetadataRequest): Promise<ApiResponse<MetadataV60>> {
    return apiClient.master.post<MetadataV60>('/mdm-v60/metadata', data);
  },

  async getMetadata(id: string): Promise<ApiResponse<MetadataV60>> {
    return apiClient.master.get<MetadataV60>(`/mdm-v60/metadata/${id}`);
  },

  async listMetadata(params?: {
    type?: MetadataType;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: MetadataV60[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: MetadataV60[]; total: number }>(
      `/mdm-v60/metadata${s ? `?${s}` : ''}`
    );
  },

  async searchMetadata(
    params?: SearchMetadataParams
  ): Promise<ApiResponse<{ items: MetadataV60[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('q', params.query);
    if (params?.type) qs.set('type', params.type);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: MetadataV60[]; total: number }>(
      `/mdm-v60/metadata/search${s ? `?${s}` : ''}`
    );
  },

  async updateMetadata(id: string, data: UpdateMetadataRequest): Promise<ApiResponse<MetadataV60>> {
    return apiClient.master.put<MetadataV60>(`/mdm-v60/metadata/${id}`, data);
  },

  async deleteMetadata(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v60/metadata/${id}`);
  },

  async addAttribute(id: string, data: AddAttributeRequest): Promise<ApiResponse<MetadataV60>> {
    return apiClient.master.post<MetadataV60>(`/mdm-v60/metadata/${id}/attribute`, data);
  },

  async addTag(data: AddTagRequest): Promise<ApiResponse<{ tagged_count: number }>> {
    return apiClient.master.post<{ tagged_count: number }>('/mdm-v60/metadata/tag', data);
  },

  async getMetadataStats(): Promise<
    ApiResponse<{
      total: number;
      by_type: Array<{ type: MetadataType; count: number }>;
      by_tag: Array<{ tag: string; count: number }>;
    }>
  > {
    return apiClient.master.get<{
      total: number;
      by_type: Array<{ type: MetadataType; count: number }>;
      by_tag: Array<{ tag: string; count: number }>;
    }>('/mdm-v60/metadata/stats');
  },

  // ===== 数据血缘增强 =====
  async buildLineageGraph(data?: BuildLineageGraphRequest): Promise<ApiResponse<LineageGraph>> {
    return apiClient.master.post<LineageGraph>('/mdm-v60/lineage/graph', data || {});
  },

  async getLineageGraph(id: string): Promise<ApiResponse<LineageGraph>> {
    return apiClient.master.get<LineageGraph>(`/mdm-v60/lineage/graph/${id}`);
  },

  async getUpstream(id: string, params?: { depth?: number }): Promise<ApiResponse<LineageNode[]>> {
    const qs = new URLSearchParams();
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    const s = qs.toString();
    return apiClient.master.get<LineageNode[]>(
      `/mdm-v60/lineage/${id}/upstream${s ? `?${s}` : ''}`
    );
  },

  async getDownstream(
    id: string,
    params?: { depth?: number }
  ): Promise<ApiResponse<LineageNode[]>> {
    const qs = new URLSearchParams();
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    const s = qs.toString();
    return apiClient.master.get<LineageNode[]>(
      `/mdm-v60/lineage/${id}/downstream${s ? `?${s}` : ''}`
    );
  },

  async getPath(data: GetPathRequest): Promise<ApiResponse<LineagePath>> {
    return apiClient.master.post<LineagePath>('/mdm-v60/lineage/path', data);
  },

  async getLineageImpact(id: string): Promise<ApiResponse<LineageImpact>> {
    return apiClient.master.get<LineageImpact>(`/mdm-v60/lineage/${id}/impact`);
  },

  async getLineageDashboard(): Promise<ApiResponse<LineageDashboard>> {
    return apiClient.master.get<LineageDashboard>('/mdm-v60/lineage/dashboard');
  },

  async exportLineage(
    format?: 'json' | 'graphml'
  ): Promise<ApiResponse<{ download_url: string; node_count: number; edge_count: number }>> {
    const qs = new URLSearchParams();
    if (format) qs.set('format', format);
    const s = qs.toString();
    return apiClient.master.get<{ download_url: string; node_count: number; edge_count: number }>(
      `/mdm-v60/lineage/export${s ? `?${s}` : ''}`
    );
  },

  // ===== 生命周期管理 =====
  async getCurrentStage(
    id: string
  ): Promise<ApiResponse<{ stage: LifecycleStage; entered_at: string }>> {
    return apiClient.master.get<{ stage: LifecycleStage; entered_at: string }>(
      `/mdm-v60/lifecycle/${id}/stage`
    );
  },

  async transitionStage(
    id: string,
    data: TransitionStageRequest
  ): Promise<ApiResponse<{ stage: LifecycleStage; history: LifecycleHistoryEntryV60[] }>> {
    return apiClient.master.post<{ stage: LifecycleStage; history: LifecycleHistoryEntryV60[] }>(
      `/mdm-v60/lifecycle/${id}/transition`,
      data
    );
  },

  async getLifecycleHistory(id: string): Promise<ApiResponse<LifecycleHistoryEntryV60[]>> {
    return apiClient.master.get<LifecycleHistoryEntryV60[]>(`/mdm-v60/lifecycle/${id}/history`);
  },

  async createPolicy(data: CreatePolicyRequest): Promise<ApiResponse<LifecyclePolicy>> {
    return apiClient.master.post<LifecyclePolicy>('/mdm-v60/lifecycle/policy', data);
  },

  async getPolicies(params?: {
    entity_type?: MetadataType;
  }): Promise<ApiResponse<LifecyclePolicy[]>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    const s = qs.toString();
    return apiClient.master.get<LifecyclePolicy[]>(
      `/mdm-v60/lifecycle/policies${s ? `?${s}` : ''}`
    );
  },

  async autoTransition(data?: AutoTransitionRequest): Promise<
    ApiResponse<{
      transitions: number;
      failures: number;
      results: Array<{ id: string; from: LifecycleStage; to: LifecycleStage; success: boolean }>;
    }>
  > {
    return apiClient.master.post<{
      transitions: number;
      failures: number;
      results: Array<{ id: string; from: LifecycleStage; to: LifecycleStage; success: boolean }>;
    }>('/mdm-v60/lifecycle/auto-transition', data || {});
  },

  async getLifecycleDashboard(): Promise<ApiResponse<LifecycleDashboard>> {
    return apiClient.master.get<LifecycleDashboard>('/mdm-v60/lifecycle/dashboard');
  },

  async bulkTransition(data: BulkTransitionRequest): Promise<
    ApiResponse<{
      transitions: number;
      failures: number;
      results: Array<{ id: string; success: boolean }>;
    }>
  > {
    return apiClient.master.post<{
      transitions: number;
      failures: number;
      results: Array<{ id: string; success: boolean }>;
    }>('/mdm-v60/lifecycle/bulk', data);
  },
};

export default metadataApiV60;
