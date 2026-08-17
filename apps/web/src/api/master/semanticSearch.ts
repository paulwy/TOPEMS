import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type GraphEntityType = 'node' | 'edge' | 'document' | 'record';

export interface SemanticNode {
  id: string;
  label: string;
  type: GraphEntityType;
  embedding?: number[];
  properties?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SemanticEdge {
  id: string;
  from_id: string;
  to_id: string;
  relation: string;
  weight?: number;
}

export interface Community {
  id: string;
  name: string;
  size: number;
  members: string[];
  modularity?: number;
}

export interface ShortestPath {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
  distance: number;
}

export interface SemanticSearchResult {
  id: string;
  entity_type: string;
  title: string;
  description?: string;
  score: number;
  highlights?: string[];
}

export interface SemanticSearchStats {
  indexed_entities: number;
  embeddings_dimension: number;
  last_reindex_at?: string;
  index_size_bytes: number;
}

export interface SemanticTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  usage_count: number;
}

export interface TagSuggestion {
  name: string;
  confidence: number;
  source: 'rule' | 'ml' | 'cooccurrence';
}

// ============ Request Types ============

export interface AddNodeRequest {
  label: string;
  type: GraphEntityType;
  properties?: Record<string, unknown>;
}

export interface AddEdgeRequest {
  from_id: string;
  to_id: string;
  relation: string;
  weight?: number;
}

export interface FindPathRequest {
  from_id: string;
  to_id: string;
  max_depth?: number;
}

export interface IndexEntityRequest {
  entity_type: string;
  entity_id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SemanticSearchRequest {
  query: string;
  entity_types?: GraphEntityType[];
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface HybridSearchRequest extends SemanticSearchRequest {
  semantic_weight?: number;
  keyword_weight?: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface ApplyTagRequest {
  entity_type: GraphEntityType;
  entity_id: string;
  tag_id: string;
}

export interface AutoTagRequest {
  entity_type: GraphEntityType;
  entity_id: string;
  strategy?: 'rule' | 'ml' | 'hybrid';
}

// ============ API ============

export const semanticSearchApi = {
  // ===== 图谱增强 =====
  async addGraphNode(data: AddNodeRequest): Promise<ApiResponse<SemanticNode>> {
    return apiClient.master.post<SemanticNode>('/mdm-v57/graph/node', data);
  },

  async addGraphEdge(data: AddEdgeRequest): Promise<ApiResponse<SemanticEdge>> {
    return apiClient.master.post<SemanticEdge>('/mdm-v57/graph/edge', data);
  },

  async getNeighbors(
    id: string,
    params?: { depth?: number; relation?: string }
  ): Promise<ApiResponse<SemanticNode[]>> {
    const qs = new URLSearchParams();
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    if (params?.relation) qs.set('relation', params.relation);
    const s = qs.toString();
    return apiClient.master.get<SemanticNode[]>(
      `/mdm-v57/graph/neighbors/${id}${s ? `?${s}` : ''}`
    );
  },

  async getCommunity(id: string): Promise<ApiResponse<Community>> {
    return apiClient.master.get<Community>(`/mdm-v57/graph/community/${id}`);
  },

  async findShortestPath(data: FindPathRequest): Promise<ApiResponse<ShortestPath>> {
    return apiClient.master.post<ShortestPath>('/mdm-v57/graph/path', data);
  },

  async getSubgraph(params?: {
    center_id?: string;
    depth?: number;
    entity_type?: GraphEntityType;
  }): Promise<ApiResponse<{ nodes: SemanticNode[]; edges: SemanticEdge[] }>> {
    const qs = new URLSearchParams();
    if (params?.center_id) qs.set('center_id', params.center_id);
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    const s = qs.toString();
    return apiClient.master.get<{ nodes: SemanticNode[]; edges: SemanticEdge[] }>(
      `/mdm-v57/graph/subgraph${s ? `?${s}` : ''}`
    );
  },

  async computeEmbeddings(data: {
    texts: string[];
    model?: string;
  }): Promise<ApiResponse<{ embeddings: number[][]; model: string }>> {
    return apiClient.master.post<{ embeddings: number[][]; model: string }>(
      '/mdm-v57/graph/embeddings',
      data
    );
  },

  async detectCommunities(data?: {
    algorithm?: 'louvain' | 'label_propagation';
    resolution?: number;
  }): Promise<ApiResponse<Community[]>> {
    return apiClient.master.post<Community[]>('/mdm-v57/graph/communities', data || {});
  },

  // ===== 语义搜索 =====
  async indexEntity(
    data: IndexEntityRequest
  ): Promise<ApiResponse<{ indexed: boolean; embedding_id?: string }>> {
    return apiClient.master.post<{ indexed: boolean; embedding_id?: string }>(
      '/mdm-v57/search/index',
      data
    );
  },

  async searchSemantic(data: SemanticSearchRequest): Promise<ApiResponse<SemanticSearchResult[]>> {
    return apiClient.master.post<SemanticSearchResult[]>('/mdm-v57/search/semantic', data);
  },

  async searchHybrid(data: HybridSearchRequest): Promise<ApiResponse<SemanticSearchResult[]>> {
    return apiClient.master.post<SemanticSearchResult[]>('/mdm-v57/search/hybrid', data);
  },

  async reindexAll(): Promise<ApiResponse<{ reindexed: number; duration_ms: number }>> {
    return apiClient.master.post<{ reindexed: number; duration_ms: number }>(
      '/mdm-v57/search/reindex',
      {}
    );
  },

  async getSearchStats(): Promise<ApiResponse<SemanticSearchStats>> {
    return apiClient.master.get<SemanticSearchStats>('/mdm-v57/search/stats');
  },

  async removeFromIndex(id: string): Promise<ApiResponse<{ removed: boolean }>> {
    return apiClient.master.delete<{ removed: boolean }>(`/mdm-v57/search/index/${id}`);
  },

  // ===== 智能标签 =====
  async createTag(data: CreateTagRequest): Promise<ApiResponse<SemanticTag>> {
    return apiClient.master.post<SemanticTag>('/mdm-v57/tags', data);
  },

  async applyTag(data: ApplyTagRequest): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.post<{ success: boolean }>('/mdm-v57/tag/apply', data);
  },

  async autoTag(
    data: AutoTagRequest
  ): Promise<ApiResponse<Array<{ tag_id: string; tag_name: string; confidence: number }>>> {
    return apiClient.master.post<Array<{ tag_id: string; tag_name: string; confidence: number }>>(
      '/mdm-v57/tag/auto',
      data
    );
  },

  async getTagsForEntity(
    entityType: GraphEntityType,
    id: string
  ): Promise<ApiResponse<SemanticTag[]>> {
    return apiClient.master.get<SemanticTag[]>(`/mdm-v57/tags/entity/${entityType}/${id}`);
  },

  async getEntitiesByTag(
    tag: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<
    ApiResponse<{ items: Array<{ id: string; name: string; type: string }>; total: number }>
  > {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{
      items: Array<{ id: string; name: string; type: string }>;
      total: number;
    }>(`/mdm-v57/entities/tag/${tag}${s ? `?${s}` : ''}`);
  },

  async removeTag(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.delete<{ success: boolean }>(`/mdm-v57/tag/${id}`);
  },

  async listTags(params?: { query?: string }): Promise<ApiResponse<SemanticTag[]>> {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('q', params.query);
    const s = qs.toString();
    return apiClient.master.get<SemanticTag[]>(`/mdm-v57/tags${s ? `?${s}` : ''}`);
  },

  async suggestTags(
    entityType: GraphEntityType,
    id: string
  ): Promise<ApiResponse<TagSuggestion[]>> {
    return apiClient.master.get<TagSuggestion[]>(
      `/mdm-v57/tags/suggest?entity_type=${entityType}&id=${id}`
    );
  },
};

export default semanticSearchApi;
