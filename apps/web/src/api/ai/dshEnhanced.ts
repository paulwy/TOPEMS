/**
 * DSH 增强能力 API 调用（kg / rag / multi-agent / performance）
 *
 * 覆盖 svc/ai routes.rs DSH Enhanced 与 Performance 两组路由（2026-10-26 解冻）：
 * - 知识图谱：entities / relations / shortest-path / link-entity / communities / stats / extract
 * - RAG：retrieve / stats
 * - 多 Agent 协作：execute
 * - Agent 性能监控：metrics / prometheus / reset / tools/{tool_name}
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ============================================================================
// 知识图谱类型
// ============================================================================

/** 图谱实体 */
export interface KgEntity {
  id: string;
  name: string;
  entity_type: string;
  description: string;
  properties: Record<string, string>;
  aliases: string[];
  confidence: number;
  created_at: string;
  updated_at: string;
}

/** 图谱关系 */
export interface KgRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string;
  properties: Record<string, string>;
  weight: number;
  confidence: number;
  created_at: string;
}

/** 实体提取结果 */
export interface KgExtractedEntity {
  text: string;
  entity_type: string;
  start_offset: number;
  end_offset: number;
  confidence: number;
}

export interface KgExtractedRelation {
  source_text: string;
  target_text: string;
  relation_type: string;
  confidence: number;
}

/** 文本提取响应 */
export interface KgExtractionResult {
  entities: KgExtractedEntity[];
  relations: KgExtractedRelation[];
  text_length: number;
  duration_ms: number;
}

/** 最短路径结果 */
export interface KgPathResult {
  entity_ids: string[];
  relation_ids: string[];
  path_length: number;
  total_weight: number;
}

/** 社区发现结果 */
export interface KgCommunity {
  community_id: number;
  entity_ids: string[];
  size: number;
  density: number;
}

/** 图谱统计 */
export interface KgStats {
  total_entities: number;
  total_relations: number;
  entities_by_type: Record<string, number>;
  relations_by_type: Record<string, number>;
  avg_entity_degree: number;
  max_entity_degree: number;
  connected_components: number;
  graph_density: number;
}

// ============================================================================
// RAG 类型
// ============================================================================

export interface RagConversationMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface RagRetrieveRequest {
  query: string;
  conversation_history?: RagConversationMessage[];
  top_k?: number;
  similarity_threshold?: number;
  filters?: Record<string, string>;
  metadata_filters?: Record<string, string[]>;
}

export interface RagDocument {
  doc_id: string;
  title: string;
  content: string;
  source: string;
  score: number;
  retrieval_method: string;
  original_rank: number;
  reranked_rank?: number;
  metadata: Record<string, string>;
}

export interface RagRetrievalStats {
  vector_results: number;
  keyword_results: number;
  merged_results: number;
  reranked_results: number;
  filtered_results: number;
  total_duration_ms: number;
  query_rewrite_duration_ms: number;
  retrieval_duration_ms: number;
  rerank_duration_ms: number;
}

export interface RagRetrievalResponse {
  original_query: string;
  rewritten_query: string;
  expanded_queries: string[];
  documents: RagDocument[];
  stats: RagRetrievalStats;
  context: string;
}

export interface RagStats {
  total_retrievals: number;
  total_documents_retrieved: number;
  avg_documents_per_query: number;
  query_rewrites: number;
  rerank_count: number;
  cache_hits: number;
}

// ============================================================================
// 多 Agent 协作类型
// ============================================================================

export interface MultiAgentRequest {
  task: string;
  collaboration_mode?: string;
  num_agents?: number;
}

export interface MultiAgentResponse {
  task_id: string;
  collaboration_mode: string;
  num_agents: number;
  result: string;
  agent_results: string[];
}

// ============================================================================
// Agent 性能类型
// ============================================================================

export interface AgentExecutionMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  total_tool_calls: number;
  avg_tool_calls: number;
  avg_iterations: number;
  success_rate: number;
}

export interface AgentToolMetrics {
  tool_name: string;
  call_count: number;
  success_count: number;
  failure_count: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  success_rate: number;
}

export interface AgentPerformanceResponse {
  execution: AgentExecutionMetrics;
  tools: AgentToolMetrics[];
  history_size: number;
}

// ============================================================================
// API
// ============================================================================

export const dshEnhancedApi = {
  // ===== 知识图谱 =====
  async listEntities(): Promise<ApiResponse<KgEntity[]>> {
    return apiClient.ai.get<KgEntity[]>('/dsh/kg/entities');
  },

  async addEntity(data: {
    id?: string;
    name: string;
    entity_type: string;
    description?: string;
    properties?: Record<string, string>;
    aliases?: string[];
  }): Promise<ApiResponse<KgEntity>> {
    return apiClient.ai.post<KgEntity>('/dsh/kg/entities', data);
  },

  async getEntity(entityId: string): Promise<ApiResponse<KgEntity>> {
    return apiClient.ai.get<KgEntity>(`/dsh/kg/entities/${entityId}`);
  },

  async deleteEntity(entityId: string): Promise<ApiResponse<string>> {
    return apiClient.ai.delete<string>(`/dsh/kg/entities/${entityId}`);
  },

  async getEntityNeighbors(entityId: string): Promise<ApiResponse<KgEntity[]>> {
    return apiClient.ai.get<KgEntity[]>(`/dsh/kg/entities/${entityId}/neighbors`);
  },

  async listRelations(): Promise<ApiResponse<KgRelation[]>> {
    return apiClient.ai.get<KgRelation[]>('/dsh/kg/relations');
  },

  async addRelation(data: {
    source_id: string;
    target_id: string;
    relation_type: string;
    description?: string;
    weight?: number;
  }): Promise<ApiResponse<KgRelation>> {
    return apiClient.ai.post<KgRelation>('/dsh/kg/relations', data);
  },

  async shortestPath(data: {
    source_id: string;
    target_id: string;
  }): Promise<ApiResponse<KgPathResult>> {
    return apiClient.ai.post<KgPathResult>('/dsh/kg/shortest-path', data);
  },

  async linkEntity(data: { name: string }): Promise<ApiResponse<KgEntity[]>> {
    return apiClient.ai.post<KgEntity[]>('/dsh/kg/link-entity', data);
  },

  async detectCommunities(): Promise<ApiResponse<KgCommunity[]>> {
    return apiClient.ai.get<KgCommunity[]>('/dsh/kg/communities');
  },

  async getGraphStats(): Promise<ApiResponse<KgStats>> {
    return apiClient.ai.get<KgStats>('/dsh/kg/stats');
  },

  async extractEntities(data: { text: string }): Promise<ApiResponse<KgExtractionResult>> {
    return apiClient.ai.post<KgExtractionResult>('/dsh/kg/extract', data);
  },

  // ===== RAG =====
  async ragRetrieve(data: RagRetrieveRequest): Promise<ApiResponse<RagRetrievalResponse>> {
    return apiClient.ai.post<RagRetrievalResponse>('/dsh/rag/retrieve', data);
  },

  async getRagStats(): Promise<ApiResponse<RagStats>> {
    return apiClient.ai.get<RagStats>('/dsh/rag/stats');
  },

  // ===== 多 Agent 协作 =====
  async multiAgentExecute(data: MultiAgentRequest): Promise<ApiResponse<MultiAgentResponse>> {
    return apiClient.ai.post<MultiAgentResponse>('/dsh/multi-agent/execute', data);
  },

  // ===== Agent 性能监控 =====
  async getPerformanceMetrics(): Promise<ApiResponse<AgentPerformanceResponse>> {
    return apiClient.ai.get<AgentPerformanceResponse>('/dsh/agent/performance/metrics');
  },

  async getToolPerformance(toolName: string): Promise<ApiResponse<AgentToolMetrics>> {
    return apiClient.ai.get<AgentToolMetrics>(`/dsh/agent/performance/tools/${toolName}`);
  },

  async resetPerformanceMetrics(): Promise<ApiResponse<void>> {
    return apiClient.ai.post<void>('/dsh/agent/performance/reset');
  },
};
