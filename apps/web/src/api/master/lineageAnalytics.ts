import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * Lineage V52 数据血缘登记 / 影响分析 / 变更传播
 * 契约（svc/master-data/src/modules/lineage_v52.rs）：
 * /lineage-v52 下 15 端点；前端经 apiClient.master（/api/master-data）访问
 */

export type EdgeType = 'derives_from' | 'transforms' | 'depends_on' | 'implements';
export type ChangeType = 'create' | 'update' | 'delete' | 'rename' | 'merge';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PropagationAction = 'cascade_update' | 'sync_notify' | 'reject' | 'transform';

export interface LineageNode {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface LineageEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: EdgeType;
  transformation_description?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  version: number;
  last_updated: string;
}

export interface RegisterLineageRequest {
  from_entity_type: string;
  from_entity_id: string;
  to_entity_type: string;
  to_entity_id: string;
  edge_type: EdgeType | string;
  transformation_description?: string;
}

export interface ImpactAnalysisRequest {
  target_entity_id: string;
  analysis_depth?: number;
  change_type: ChangeType | string;
  include_chain_reactions?: boolean;
}

export interface AffectedNode {
  node_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  is_direct: boolean;
  dependency_depth: number;
}

export interface AffectedService {
  service_name: string;
  impact_type: string;
  severity: string;
}

export interface ChainReaction {
  step: number;
  trigger_node_id: string;
  affected_node_id: string;
  propagation_path: string[];
}

export interface ImpactAnalysisResult {
  id: string;
  target_node: LineageNode;
  affected_nodes: AffectedNode[];
  affected_services: AffectedService[];
  risk_level: RiskLevel;
  chain_reactions: ChainReaction[];
  recommendations: string[];
  analyzed_at: string;
}

export interface ImpactSimulation {
  id: string;
  entity_type: string;
  entity_id: string;
  simulated_change: ChangeType;
  affected_scope: Record<string, unknown>;
  risk_assessment: string;
  simulation_timestamp: string;
}

export interface SimulateChangeRequest {
  entity_type: string;
  entity_id: string;
  change_type: ChangeType | string;
}

export interface PropagateChangeRequest {
  entity_type: string;
  entity_id: string;
  change_type: ChangeType | string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface PropagationRule {
  id: string;
  source_entity_type: string;
  target_entity_type: string;
  condition: string;
  action: PropagationAction;
}

export interface AddPropagationRuleRequest {
  source_entity_type: string;
  target_entity_type: string;
  condition: string;
  action: PropagationAction | string;
}

export interface PropagationLog {
  id: string;
  change_event_id: string;
  rule_id: string;
  source_entity_id: string;
  target_entity_id: string;
  action: PropagationAction;
  status: string;
  propagated_at: string;
  rollback_id?: string;
}

export const lineageAnalyticsApi = {
  // ===== 血缘登记 =====
  register: async (data: RegisterLineageRequest): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.master.post('/lineage-v52/register', data);
  },

  getGraph: async (): Promise<ApiResponse<LineageGraph>> => {
    return apiClient.master.get('/lineage-v52/graph');
  },

  getUpstream: async (
    entityType: string,
    id: string,
    depth?: number
  ): Promise<ApiResponse<LineageNode[]>> => {
    return apiClient.master.get(`/lineage-v52/upstream/${entityType}/${id}`, {
      params: depth ? { depth } : undefined,
    });
  },

  getDownstream: async (
    entityType: string,
    id: string,
    depth?: number
  ): Promise<ApiResponse<LineageNode[]>> => {
    return apiClient.master.get(`/lineage-v52/downstream/${entityType}/${id}`, {
      params: depth ? { depth } : undefined,
    });
  },

  export: async (format?: string): Promise<ApiResponse<{ exported: boolean }>> => {
    return apiClient.master.get('/lineage-v52/export', {
      params: format ? { format } : undefined,
    });
  },

  remove: async (nodeId: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.master.post('/lineage-v52/delete', { node_id: nodeId });
  },

  // ===== 影响分析 =====
  analyzeImpact: async (
    data: ImpactAnalysisRequest
  ): Promise<ApiResponse<ImpactAnalysisResult>> => {
    return apiClient.master.post('/lineage-v52/impact/analyze', data);
  },

  getImpactReport: async (id: string): Promise<ApiResponse<ImpactAnalysisResult>> => {
    return apiClient.master.get(`/lineage-v52/impact/report/${id}`);
  },

  simulateChange: async (data: SimulateChangeRequest): Promise<ApiResponse<ImpactSimulation>> => {
    return apiClient.master.post('/lineage-v52/impact/simulate', data);
  },

  getAffectedScope: async (
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<{ affected: unknown }>> => {
    return apiClient.master.get('/lineage-v52/impact/scope', {
      params: { entity_type: entityType, entity_id: entityId },
    });
  },

  // ===== 变更传播 =====
  propagate: async (data: PropagateChangeRequest): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.master.post('/lineage-v52/propagate', data);
  },

  getPropagationRules: async (): Promise<ApiResponse<PropagationRule[]>> => {
    return apiClient.master.get('/lineage-v52/propagation/rules');
  },

  addPropagationRule: async (
    data: AddPropagationRuleRequest
  ): Promise<ApiResponse<PropagationRule>> => {
    return apiClient.master.post('/lineage-v52/propagation/rules', data);
  },

  getPropagationLog: async (): Promise<ApiResponse<PropagationLog[]>> => {
    return apiClient.master.get('/lineage-v52/propagation/log');
  },

  rollbackPropagation: async (
    propagationId: string
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.master.post('/lineage-v52/propagation/rollback', {
      propagation_id: propagationId,
    });
  },
};

export default lineageAnalyticsApi;
