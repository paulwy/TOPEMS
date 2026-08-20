import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

interface KGNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
  degree?: number;
}

interface KGEdge {
  id: string;
  from_node: string;
  to_node: string;
  relation: string;
  weight?: number;
}

interface KGSubgraph {
  nodes: KGNode[];
  edges: KGEdge[];
}

interface KGPath {
  from_node: string;
  to_node: string;
  nodes: KGNode[];
  edges: KGEdge[];
  total_weight: number;
  hops: number;
}

interface KGSimilarNode {
  node: KGNode;
  similarity: number;
}

interface KGRecommendation {
  id: string;
  type: string;
  title: string;
  reason: string;
  confidence: number;
}

interface KGAsset {
  id: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  owner?: string;
  access_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface KGInteraction {
  id: string;
  user_id: string;
  node_id: string;
  type: 'view' | 'search' | 'bookmark' | 'share' | 'edit';
  created_at: string;
}

interface KGCategory {
  id: string;
  name: string;
  count: number;
  parent_id?: string;
}

interface KGExport {
  format: 'json' | 'graphml' | 'gexf';
  size_bytes: number;
  node_count: number;
  edge_count: number;
  generated_at: string;
}

// ============ Request Types ============

interface AddNodeRequest {
  label: string;
  type: string;
  properties?: Record<string, unknown>;
}

interface AddEdgeRequest {
  from_node: string;
  to_node: string;
  relation: string;
  weight?: number;
}

interface AddInteractionRequest {
  type: 'view' | 'search' | 'bookmark' | 'share' | 'edit';
  node_id: string;
  context?: string;
}

interface RegisterAssetRequest {
  name: string;
  type: string;
  description?: string;
  category?: string;
  owner?: string;
  access_url?: string;
  tags?: string[];
}

interface SearchAssetsParams {
  query?: string;
  type?: string;
  category?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// ============ API ============

export const knowledgeGraphApi = {
  // ===== 节点与边 =====
  async addNode(data: AddNodeRequest): Promise<ApiResponse<KGNode>> {
    return apiClient.master.post<KGNode>('/kg-v53/nodes', data);
  },

  async addEdge(data: AddEdgeRequest): Promise<ApiResponse<KGEdge>> {
    return apiClient.master.post<KGEdge>('/kg-v53/edges', data);
  },

  async getSubgraph(nodeId: string, params?: { depth?: number }): Promise<ApiResponse<KGSubgraph>> {
    const qs = new URLSearchParams();
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    const s = qs.toString();
    return apiClient.master.get<KGSubgraph>(`/kg-v53/subgraph/${nodeId}${s ? `?${s}` : ''}`);
  },

  async findPath(params: {
    from: string;
    to: string;
    max_depth?: number;
  }): Promise<ApiResponse<KGPath>> {
    const qs = new URLSearchParams();
    qs.set('from', params.from);
    qs.set('to', params.to);
    if (params.max_depth !== undefined) qs.set('max_depth', String(params.max_depth));
    return apiClient.master.get<KGPath>(`/kg-v53/path?${qs.toString()}`);
  },

  async getSimilar(
    nodeId: string,
    params?: { limit?: number }
  ): Promise<ApiResponse<KGSimilarNode[]>> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<KGSimilarNode[]>(`/kg-v53/similar/${nodeId}${s ? `?${s}` : ''}`);
  },

  async exportKg(params?: {
    format?: 'json' | 'graphml' | 'gexf';
    scope?: 'full' | 'subgraph';
  }): Promise<ApiResponse<KGExport>> {
    const qs = new URLSearchParams();
    if (params?.format) qs.set('format', params.format);
    if (params?.scope) qs.set('scope', params.scope);
    const s = qs.toString();
    return apiClient.master.get<KGExport>(`/kg-v53/export${s ? `?${s}` : ''}`);
  },

  // ===== 推荐与交互 =====
  async getRecommendations(userId: string): Promise<ApiResponse<KGRecommendation[]>> {
    return apiClient.master.get<KGRecommendation[]>(`/kg-v53/recommendations/${userId}`);
  },

  async recordInteraction(data: AddInteractionRequest): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.master.post<{ success: boolean }>('/kg-v53/interactions', data);
  },

  async getSimilarItems(
    itemId: string,
    params?: { limit?: number }
  ): Promise<ApiResponse<Array<{ id: string; name: string; similarity: number }>>> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<Array<{ id: string; name: string; similarity: number }>>(
      `/kg-v53/similar-items/${itemId}${s ? `?${s}` : ''}`
    );
  },

  async getTrendingItems(params?: {
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<Array<{ id: string; name: string; score: number }>>> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.category) qs.set('category', params.category);
    const s = qs.toString();
    return apiClient.master.get<Array<{ id: string; name: string; score: number }>>(
      `/kg-v53/trending${s ? `?${s}` : ''}`
    );
  },

  // ===== 资产 =====
  async registerAsset(data: RegisterAssetRequest): Promise<ApiResponse<KGAsset>> {
    return apiClient.master.post<KGAsset>('/kg-v53/assets', data);
  },

  async searchAssets(
    params?: SearchAssetsParams
  ): Promise<ApiResponse<{ items: KGAsset[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('q', params.query);
    if (params?.type) qs.set('type', params.type);
    if (params?.category) qs.set('category', params.category);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: KGAsset[]; total: number }>(
      `/kg-v53/assets${s ? `?${s}` : ''}`
    );
  },

  async getAssetStats(): Promise<
    ApiResponse<{
      total: number;
      by_type: Array<{ type: string; count: number }>;
      by_category: Array<{ category: string; count: number }>;
    }>
  > {
    return apiClient.master.get<{
      total: number;
      by_type: Array<{ type: string; count: number }>;
      by_category: Array<{ category: string; count: number }>;
    }>('/kg-v53/assets/stats');
  },

  async getAsset(id: string): Promise<ApiResponse<KGAsset>> {
    return apiClient.master.get<KGAsset>(`/kg-v53/assets/${id}`);
  },

  async updateAsset(
    id: string,
    data: Partial<RegisterAssetRequest>
  ): Promise<ApiResponse<KGAsset>> {
    return apiClient.master.put<KGAsset>(`/kg-v53/assets/${id}`, data);
  },

  async listCategories(): Promise<ApiResponse<KGCategory[]>> {
    return apiClient.master.get<KGCategory[]>('/kg-v53/categories');
  },
};

export default knowledgeGraphApi;
