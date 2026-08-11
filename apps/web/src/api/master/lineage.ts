import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface LineageNode {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  attributes?: Record<string, unknown>;
}

export interface LineageEdge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  confidence?: number;
  created_at?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface ImpactReport {
  id: string;
  entity_type: string;
  entity_id: string;
  change_description: string;
  affected_upstream: number;
  affected_downstream: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
  generated_at: string;
}

export interface PropagationRule {
  id: string;
  name: string;
  source_type: string;
  target_type: string;
  condition?: string;
  action: string;
  enabled: boolean;
}

export const lineageApi = {
  // ==================== 血缘注册与查询 ====================

  register: async (data: {
    nodes: LineageNode[];
    edges: LineageEdge[];
  }): Promise<ApiResponse<void>> => {
    return apiClient.master.post('/lineage-v52/register', data);
  },

  getGraph: async (params?: {
    entity_type?: string;
    depth?: number;
  }): Promise<ApiResponse<LineageGraph>> => {
    return apiClient.master.get('/lineage-v52/graph', { params });
  },

  getUpstream: async (entityType: string, id: string): Promise<ApiResponse<LineageGraph>> => {
    return apiClient.master.get(`/lineage-v52/upstream/${entityType}/${id}`);
  },

  getDownstream: async (entityType: string, id: string): Promise<ApiResponse<LineageGraph>> => {
    return apiClient.master.get(`/lineage-v52/downstream/${entityType}/${id}`);
  },

  export: async (params?: { format?: 'json' | 'csv' | 'dot' }): Promise<Blob> => {
    return apiClient.master.get('/lineage-v52/export', {
      params,
      responseType: 'blob',
    });
  },

  delete: async (data: {
    node_ids?: string[];
    edge_ids?: string[];
  }): Promise<ApiResponse<void>> => {
    return apiClient.master.post('/lineage-v52/delete', data);
  },

  // ==================== 影响分析 ====================

  analyzeImpact: async (data: {
    entity_type: string;
    entity_id: string;
    change_type: string;
    details?: Record<string, unknown>;
  }): Promise<ApiResponse<ImpactReport>> => {
    return apiClient.master.post('/lineage-v52/impact/analyze', data);
  },

  getImpactReport: async (id: string): Promise<ApiResponse<ImpactReport>> => {
    return apiClient.master.get(`/lineage-v52/impact/report/${id}`);
  },

  simulateChange: async (data: {
    entity_type: string;
    entity_id: string;
    proposed_change: Record<string, unknown>;
  }): Promise<ApiResponse<{
    affected_entities: Array<{ entity_type: string; entity_id: string; impact: string }>;
    risk_score: number;
  }>> => {
    return apiClient.master.post('/lineage-v52/impact/simulate', data);
  },

  getAffectedScope: async (entityType: string, id: string): Promise<ApiResponse<{
    upstream_count: number;
    downstream_count: number;
    critical_entities: Array<{ entity_type: string; count: number }>;
  }>> => {
    return apiClient.master.get('/lineage-v52/impact/scope', {
      params: { entity_type: entityType, id } as unknown as Record<string, string>,
    });
  },

  // ==================== 变更传播 ====================

  propagate: async (data: {
    entity_type: string;
    entity_id: string;
    change_type: string;
    payload?: Record<string, unknown>;
  }): Promise<ApiResponse<{ propagation_id: string; status: string }>> => {
    return apiClient.master.post('/lineage-v52/propagate', data);
  },

  getPropagationRules: async (params?: {
    source_type?: string;
    target_type?: string;
    enabled?: boolean;
  }): Promise<ApiResponse<PropagationRule[]>> => {
    return apiClient.master.get('/lineage-v52/propagation/rules', { params });
  },

  addPropagationRule: async (data: Omit<PropagationRule, 'id'>): Promise<ApiResponse<PropagationRule>> => {
    return apiClient.master.post('/lineage-v52/propagation/rules', data);
  },

  getPropagationLog: async (params?: {
    entity_type?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResponse<Array<{ id: string; entity_type: string; entity_id: string; status: string; propagated_at: string }>>> => {
    return apiClient.master.get('/lineage-v52/propagation/log', { params });
  },

  rollbackPropagation: async (data: {
    propagation_id: string;
    reason?: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.master.post('/lineage-v52/propagation/rollback', data);
  },
};

export default lineageApi;
