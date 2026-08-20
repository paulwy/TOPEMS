import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';

interface MetadataRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string;
  owner?: string;
  domain?: string;
  attributes?: Array<{ name: string; value: string; type?: string }>;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface LineageDashboard {
  total_entities: number;
  total_relations: number;
  critical_paths: number;
  data_flow_summary: Array<{ source: string; target: string; count: number }>;
}

export interface LifecycleStage {
  id: string;
  name: string;
  order: number;
  description?: string;
  is_current?: boolean;
}

export interface LifecyclePolicy {
  id: string;
  name: string;
  entity_type: string;
  transitions: Array<{
    from_stage: string;
    to_stage: string;
    condition?: string;
    action?: string;
  }>;
  auto_transition?: boolean;
  enabled: boolean;
}

export interface LifecycleDashboard {
  entity_type: string;
  stages: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  recent_transitions: Array<{
    entity_id: string;
    from_stage: string;
    to_stage: string;
    transitioned_at: string;
  }>;
  avg_time_in_stage: Record<string, number>;
}

export const metadataApi = {
  // ==================== 元数据管理 ====================

  create: async (data: Omit<MetadataRecord, 'id'>): Promise<ApiResponse<MetadataRecord>> => {
    return apiClient.master.post('/mdm-v60/metadata', data);
  },

  get: async (id: string): Promise<ApiResponse<MetadataRecord>> => {
    return apiClient.master.get(`/mdm-v60/metadata/${id}`);
  },

  list: async (params?: {
    entity_type?: string;
    owner?: string;
    domain?: string;
    tag?: string;
  }): Promise<ApiResponse<MetadataRecord[]>> => {
    return apiClient.master.get('/mdm-v60/metadata', { params });
  },

  search: async (data: {
    query: string;
    entity_type?: string;
    filters?: Record<string, unknown>;
  }): Promise<ApiResponse<MetadataRecord[]>> => {
    return apiClient.master.get('/mdm-v60/metadata/search', {
      params: data as unknown as Record<string, unknown>,
    });
  },

  update: async (
    id: string,
    data: Partial<MetadataRecord>
  ): Promise<ApiResponse<MetadataRecord>> => {
    return apiClient.master.put(`/mdm-v60/metadata/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.master.delete(`/mdm-v60/metadata/${id}`);
  },

  addAttribute: async (
    id: string,
    data: {
      name: string;
      value: string;
      type?: string;
    }
  ): Promise<ApiResponse<MetadataRecord>> => {
    return apiClient.master.post(`/mdm-v60/metadata/${id}/attribute`, data);
  },

  addTag: async (data: { metadata_id: string; tag: string }): Promise<ApiResponse<void>> => {
    return apiClient.master.post('/mdm-v60/metadata/tag', data);
  },

  getStats: async (params?: {
    entity_type?: string;
  }): Promise<
    ApiResponse<{
      total_metadata: number;
      by_entity_type: Record<string, number>;
      by_owner: Record<string, number>;
      recent_updates: Array<{ id: string; title: string; updated_at: string }>;
    }>
  > => {
    return apiClient.master.get('/mdm-v60/metadata/stats', { params });
  },

  // ==================== 数据血缘增强 ====================

  buildLineageGraph: async (data: {
    entity_type: string;
    entity_ids?: string[];
  }): Promise<ApiResponse<{ graph_id: string; node_count: number; edge_count: number }>> => {
    return apiClient.master.post('/mdm-v60/lineage/graph', data);
  },

  getLineageGraph: async (
    id: string
  ): Promise<
    ApiResponse<{
      nodes: Array<{ id: string; entity_type: string; name: string }>;
      edges: Array<{ source: string; target: string; type: string }>;
    }>
  > => {
    return apiClient.master.get(`/mdm-v60/lineage/graph/${id}`);
  },

  getUpstream: async (
    id: string
  ): Promise<
    ApiResponse<
      Array<{
        entity_type: string;
        entity_id: string;
        name: string;
        relation: string;
      }>
    >
  > => {
    return apiClient.master.get(`/mdm-v60/lineage/${id}/upstream`);
  },

  getDownstream: async (
    id: string
  ): Promise<
    ApiResponse<
      Array<{
        entity_type: string;
        entity_id: string;
        name: string;
        relation: string;
      }>
    >
  > => {
    return apiClient.master.get(`/mdm-v60/lineage/${id}/downstream`);
  },

  getPath: async (data: {
    source_type: string;
    source_id: string;
    target_type: string;
    target_id: string;
  }): Promise<
    ApiResponse<
      Array<{
        entity_type: string;
        entity_id: string;
        name: string;
      }>
    >
  > => {
    return apiClient.master.post('/mdm-v60/lineage/path', data);
  },

  getLineageImpact: async (
    id: string
  ): Promise<
    ApiResponse<{
      affected_count: number;
      risk_level: 'low' | 'medium' | 'high';
      details: Array<{ entity_type: string; entity_id: string; impact: string }>;
    }>
  > => {
    return apiClient.master.get(`/mdm-v60/lineage/${id}/impact`);
  },

  getLineageDashboard: async (params?: {
    entity_type?: string;
  }): Promise<ApiResponse<LineageDashboard>> => {
    return apiClient.master.get('/mdm-v60/lineage/dashboard', { params });
  },

  exportLineage: async (params?: {
    format?: 'json' | 'csv' | 'graphml';
    scope?: 'full' | 'upstream' | 'downstream';
  }): Promise<Blob> => {
    return downloadBlob('master', '/mdm-v60/lineage/export', { params });
  },

  // ==================== 生命周期管理 ====================

  getCurrentStage: async (id: string): Promise<ApiResponse<LifecycleStage>> => {
    return apiClient.master.get(`/mdm-v60/lifecycle/${id}/stage`);
  },

  transitionStage: async (
    id: string,
    data: {
      target_stage: string;
      reason?: string;
    }
  ): Promise<ApiResponse<LifecycleStage>> => {
    return apiClient.master.post(`/mdm-v60/lifecycle/${id}/transition`, data);
  },

  getLifecycleHistory: async (
    id: string
  ): Promise<
    ApiResponse<
      Array<{
        from_stage: string;
        to_stage: string;
        transitioned_at: string;
        reason?: string;
      }>
    >
  > => {
    return apiClient.master.get(`/mdm-v60/lifecycle/${id}/history`);
  },

  createPolicy: async (
    data: Omit<LifecyclePolicy, 'id'>
  ): Promise<ApiResponse<LifecyclePolicy>> => {
    return apiClient.master.post('/mdm-v60/lifecycle/policy', data);
  },

  getPolicies: async (params?: {
    entity_type?: string;
    enabled?: boolean;
  }): Promise<ApiResponse<LifecyclePolicy[]>> => {
    return apiClient.master.get('/mdm-v60/lifecycle/policies', { params });
  },

  autoTransition: async (data: {
    entity_type?: string;
    dry_run?: boolean;
  }): Promise<
    ApiResponse<{
      transitioned_count: number;
      failed_count: number;
      details?: Array<{ id: string; from: string; to: string }>;
    }>
  > => {
    return apiClient.master.post('/mdm-v60/lifecycle/auto-transition', data);
  },

  getLifecycleDashboard: async (params?: {
    entity_type?: string;
  }): Promise<ApiResponse<LifecycleDashboard>> => {
    return apiClient.master.get('/mdm-v60/lifecycle/dashboard', { params });
  },

  bulkTransition: async (data: {
    entity_ids: string[];
    target_stage: string;
  }): Promise<
    ApiResponse<{
      success_count: number;
      failed_count: number;
      errors?: Array<{ id: string; error: string }>;
    }>
  > => {
    return apiClient.master.post('/mdm-v60/lifecycle/bulk', data);
  },
};

export default metadataApi;
