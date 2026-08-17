import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type LineageDirection = 'upstream' | 'downstream' | 'bidirectional';
export type LineageNodeType =
  'source' | 'transform' | 'destination' | 'table' | 'column' | 'view' | 'materialized_view';
export type LineageEdgeType =
  'read' | 'write' | 'transform' | 'aggregate' | 'join' | 'filter' | 'group_by';
export type ImpactSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ImpactStatus = 'analyzing' | 'completed' | 'failed';
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface LineageNode {
  id: string;
  name: string;
  type: LineageNodeType;
  schema?: string;
  database?: string;
  column?: string;
  metadata?: Record<string, unknown>;
  stats?: {
    row_count?: number;
    column_count?: number;
    last_updated?: string;
  };
}

export interface LineageEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: LineageEdgeType;
  confidence: number;
  transformation?: string;
  condition?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  root_node_id: string;
  direction: LineageDirection;
  depth: number;
  generated_at: string;
}

export interface ColumnLineage {
  id: string;
  source_column: {
    database: string;
    schema: string;
    table: string;
    column: string;
  };
  target_column: {
    database: string;
    schema: string;
    table: string;
    column: string;
  };
  transformation: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface ImpactAnalysis {
  id: string;
  status: ImpactStatus;
  target: {
    type: 'column' | 'table' | 'view' | 'materialized_view';
    database: string;
    schema: string;
    name: string;
    column?: string;
  };
  change_type: 'schema_change' | 'data_change' | 'rename' | 'drop' | 'add_column' | 'modify_column';
  severity: ImpactSeverity;
  affected_objects: Array<{
    type: 'table' | 'view' | 'report' | 'dashboard' | 'pipeline' | 'api';
    name: string;
    database?: string;
    schema?: string;
    impact_level: ImpactSeverity;
    description: string;
  }>;
  affected_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  execution_time_ms: number;
  created_at: string;
  completed_at?: string;
}

export interface ChangePropagationPath {
  id: string;
  source_node_id: string;
  target_node_id: string;
  path: Array<{
    node_id: string;
    node_name: string;
    node_type: LineageNodeType;
    edge_type: LineageEdgeType;
    transformation?: string;
    distance: number;
  }>;
  total_hops: number;
  criticality_score: number;
  confidence: number;
}

export interface LineageDiff {
  id: string;
  previous_node?: LineageNode;
  current_node?: LineageNode;
  previous_edges: LineageEdge[];
  current_edges: LineageEdge[];
  changes: Array<{
    type: DiffType;
    object_type: 'node' | 'edge';
    object_id: string;
    description: string;
  }>;
  total_changes: number;
  generated_at: string;
}

export interface LineageStats {
  total_tables: number;
  total_columns: number;
  total_lineage_edges: number;
  coverage_rate: number;
  quality_score: number;
  columns_with_lineage: number;
  columns_without_lineage: number;
  tables_with_lineage: number;
  tables_without_lineage: number;
  lineage_by_type: Record<LineageEdgeType, number>;
  recent_changes_7d: number;
  top_sources: Array<{ name: string; count: number }>;
  top_destinations: Array<{ name: string; count: number }>;
  orphan_nodes: number;
}

export interface LineageDashboard {
  overview: {
    total_nodes: number;
    total_edges: number;
    coverage_rate: number;
    quality_score: number;
    critical_paths: number;
    last_refresh: string;
  };
  lineage_coverage: Array<{
    category: 'tables' | 'columns' | 'views' | 'materialized_views';
    total: number;
    covered: number;
    rate: number;
  }>;
  impact_summary: {
    total_analyses: number;
    pending: number;
    critical_impacts: number;
    high_impacts: number;
    avg_analysis_time_ms: number;
  };
  recent_impacts: Array<{
    id: string;
    target: string;
    severity: ImpactSeverity;
    affected_count: number;
    created_at: string;
  }>;
  lineage_health: {
    orphan_nodes: number;
    disconnected_components: number;
    avg_quality_score: number;
    confidence_distribution: Record<string, number>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetLineageGraphRequest {
  database?: string;
  schema?: string;
  table?: string;
  column?: string;
  direction?: LineageDirection;
  depth?: number;
  include_views?: boolean;
  include_materialized_views?: boolean;
  filters?: {
    node_types?: LineageNodeType[];
    edge_types?: LineageEdgeType[];
    min_confidence?: number;
  };
}

export interface TraceColumnLineageRequest {
  database: string;
  schema: string;
  table: string;
  column: string;
  direction?: LineageDirection;
  include_transformations?: boolean;
  min_confidence?: number;
}

export interface RunImpactAnalysisRequest {
  target: {
    type: 'column' | 'table' | 'view' | 'materialized_view';
    database: string;
    schema: string;
    name: string;
    column?: string;
  };
  change_type: ImpactAnalysis['change_type'];
  include_indirect?: boolean;
  max_depth?: number;
  filters?: {
    severities?: ImpactSeverity[];
    object_types?: ImpactAnalysis['affected_objects'][0]['type'][];
  };
}

export interface GetPropagationPathRequest {
  source_node_id: string;
  target_node_id: string;
  max_hops?: number;
  include_indirect?: boolean;
}

// ============ API ============

export const dataLineageEnhancedApiV77 = {
  // ===== 数据流向追踪 =====
  async getLineageGraph(params: GetLineageGraphRequest): Promise<ApiResponse<LineageGraph>> {
    const qs = new URLSearchParams();
    if (params.database) qs.set('database', params.database);
    if (params.schema) qs.set('schema', params.schema);
    if (params.table) qs.set('table', params.table);
    if (params.column) qs.set('column', params.column);
    if (params.direction) qs.set('direction', params.direction);
    if (params.depth !== undefined) qs.set('depth', String(params.depth));
    if (params.include_views !== undefined) qs.set('include_views', String(params.include_views));
    if (params.include_materialized_views !== undefined)
      qs.set('include_materialized_views', String(params.include_materialized_views));
    const s = qs.toString();
    return apiClient.master.get<LineageGraph>(`/mdm-v77/graph${s ? `?${s}` : ''}`);
  },

  async listLineageNodes(params?: {
    type?: LineageNodeType;
    database?: string;
    schema?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<LineageNode>>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.database) qs.set('database', params.database);
    if (params?.schema) qs.set('schema', params.schema);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<LineageNode>>(
      `/mdm-v77/nodes${s ? `?${s}` : ''}`
    );
  },

  async getLineageNode(id: string): Promise<ApiResponse<LineageNode>> {
    return apiClient.master.get<LineageNode>(`/mdm-v77/nodes/${id}`);
  },

  async listLineageEdges(params?: {
    source_id?: string;
    target_id?: string;
    type?: LineageEdgeType;
    min_confidence?: number;
  }): Promise<ApiResponse<LineageEdge[]>> {
    const qs = new URLSearchParams();
    if (params?.source_id) qs.set('source_id', params.source_id);
    if (params?.target_id) qs.set('target_id', params.target_id);
    if (params?.type) qs.set('type', params.type);
    if (params?.min_confidence !== undefined)
      qs.set('min_confidence', String(params.min_confidence));
    const s = qs.toString();
    return apiClient.master.get<LineageEdge[]>(`/mdm-v77/edges${s ? `?${s}` : ''}`);
  },

  async refreshLineage(params?: {
    database?: string;
    schema?: string;
    force?: boolean;
  }): Promise<ApiResponse<{ job_id: string; status: string }>> {
    const qs = new URLSearchParams();
    if (params?.database) qs.set('database', params.database);
    if (params?.schema) qs.set('schema', params.schema);
    if (params?.force !== undefined) qs.set('force', String(params.force));
    const s = qs.toString();
    return apiClient.master.post<{ job_id: string; status: string }>(
      `/mdm-v77/refresh${s ? `?${s}` : ''}`,
      {}
    );
  },

  async getLineageRefreshStatus(jobId: string): Promise<
    ApiResponse<{
      job_id: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      nodes_processed: number;
      total_nodes: number;
      error_message?: string;
    }>
  > {
    return apiClient.master.get<{
      job_id: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      nodes_processed: number;
      total_nodes: number;
      error_message?: string;
    }>(`/mdm-v77/refresh/${jobId}`);
  },

  // ===== 列级血缘分析 =====
  async traceColumnLineage(
    params: TraceColumnLineageRequest
  ): Promise<ApiResponse<ColumnLineage[]>> {
    const qs = new URLSearchParams();
    qs.set('database', params.database);
    qs.set('schema', params.schema);
    qs.set('table', params.table);
    qs.set('column', params.column);
    if (params.direction) qs.set('direction', params.direction);
    if (params.include_transformations !== undefined)
      qs.set('include_transformations', String(params.include_transformations));
    if (params.min_confidence !== undefined)
      qs.set('min_confidence', String(params.min_confidence));
    return apiClient.master.get<ColumnLineage[]>(`/mdm-v77/column-lineage?${qs.toString()}`);
  },

  async batchTraceColumnLineage(columns: TraceColumnLineageRequest[]): Promise<
    ApiResponse<{
      total_requested: number;
      completed: number;
      failed: number;
      results: ColumnLineage[];
    }>
  > {
    return apiClient.master.post<{
      total_requested: number;
      completed: number;
      failed: number;
      results: ColumnLineage[];
    }>('/mdm-v77/column-lineage/batch', { columns });
  },

  // ===== 影响分析 =====
  async runImpactAnalysis(params: RunImpactAnalysisRequest): Promise<ApiResponse<ImpactAnalysis>> {
    return apiClient.master.post<ImpactAnalysis>('/mdm-v77/impact-analysis', params);
  },

  async getImpactAnalysis(id: string): Promise<ApiResponse<ImpactAnalysis>> {
    return apiClient.master.get<ImpactAnalysis>(`/mdm-v77/impact-analysis/${id}`);
  },

  async listImpactAnalyses(params?: {
    target_type?: ImpactAnalysis['target']['type'];
    change_type?: ImpactAnalysis['change_type'];
    severity?: ImpactSeverity;
    status?: ImpactStatus;
    created_by?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ImpactAnalysis>>> {
    const qs = new URLSearchParams();
    if (params?.target_type) qs.set('target_type', params.target_type);
    if (params?.change_type) qs.set('change_type', params.change_type);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.created_by) qs.set('created_by', params.created_by);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ImpactAnalysis>>(
      `/mdm-v77/impact-analysis${s ? `?${s}` : ''}`
    );
  },

  async deleteImpactAnalysis(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v77/impact-analysis/${id}`);
  },

  // ===== 变更传播路径 =====
  async getPropagationPath(
    params: GetPropagationPathRequest
  ): Promise<ApiResponse<ChangePropagationPath>> {
    const qs = new URLSearchParams();
    qs.set('source_node_id', params.source_node_id);
    qs.set('target_node_id', params.target_node_id);
    if (params.max_hops !== undefined) qs.set('max_hops', String(params.max_hops));
    if (params.include_indirect !== undefined)
      qs.set('include_indirect', String(params.include_indirect));
    return apiClient.master.get<ChangePropagationPath>(
      `/mdm-v77/propagation-path?${qs.toString()}`
    );
  },

  async getMultiplePropagationPaths(
    paths: GetPropagationPathRequest[]
  ): Promise<ApiResponse<ChangePropagationPath[]>> {
    return apiClient.master.post<ChangePropagationPath[]>('/mdm-v77/propagation-path/batch', {
      paths,
    });
  },

  async getShortestPath(
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<ApiResponse<ChangePropagationPath>> {
    return apiClient.master.get<ChangePropagationPath>(
      `/mdm-v77/shortest-path?source=${sourceNodeId}&target=${targetNodeId}`
    );
  },

  // ===== 血缘差异对比 =====
  async compareLineage(
    baselineDate: string,
    currentDate: string
  ): Promise<ApiResponse<LineageDiff>> {
    return apiClient.master.get<LineageDiff>(
      `/mdm-v77/diff?baseline=${baselineDate}&current=${currentDate}`
    );
  },

  async compareNodeLineage(
    nodeId: string,
    baselineDate: string,
    currentDate: string
  ): Promise<ApiResponse<LineageDiff>> {
    return apiClient.master.get<LineageDiff>(
      `/mdm-v77/diff/nodes/${nodeId}?baseline=${baselineDate}&current=${currentDate}`
    );
  },

  async listLineageDiffs(params?: {
    from_date?: string;
    to_date?: string;
    severity?: ImpactSeverity;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<LineageDiff>>> {
    const qs = new URLSearchParams();
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<LineageDiff>>(
      `/mdm-v77/diffs${s ? `?${s}` : ''}`
    );
  },

  // ===== 血缘统计 =====
  async getLineageStats(): Promise<ApiResponse<LineageStats>> {
    return apiClient.master.get<LineageStats>('/mdm-v77/stats');
  },

  async getLineageCoverage(
    database?: string,
    schema?: string
  ): Promise<
    ApiResponse<
      {
        category: string;
        total: number;
        covered: number;
        coverage_rate: number;
        top_uncovred: Array<{ name: string; type: string }>;
      }[]
    >
  > {
    const qs = new URLSearchParams();
    if (database) qs.set('database', database);
    if (schema) qs.set('schema', schema);
    const s = qs.toString();
    return apiClient.master.get<
      {
        category: string;
        total: number;
        covered: number;
        coverage_rate: number;
        top_uncovred: Array<{ name: string; type: string }>;
      }[]
    >(`/mdm-v77/coverage${s ? `?${s}` : ''}`);
  },

  async getOrphanNodes(): Promise<ApiResponse<LineageNode[]>> {
    return apiClient.master.get<LineageNode[]>('/mdm-v77/orphans');
  },

  async fixOrphanNode(nodeId: string, targetNodeId: string): Promise<ApiResponse<LineageEdge>> {
    return apiClient.master.post<LineageEdge>('/mdm-v77/orphans/fix', {
      orphan_node_id: nodeId,
      target_node_id: targetNodeId,
    });
  },

  // ===== 仪表板 =====
  async getLineageDashboard(): Promise<ApiResponse<LineageDashboard>> {
    return apiClient.master.get<LineageDashboard>('/mdm-v77/dashboard');
  },

  async exportLineageReport(
    format: 'json' | 'csv' | 'pdf',
    params?: {
      database?: string;
      schema?: string;
      include_nodes?: boolean;
      include_edges?: boolean;
      include_stats?: boolean;
    }
  ): Promise<ApiResponse<{ download_url: string }>> {
    const qs = new URLSearchParams();
    qs.set('format', format);
    if (params?.database) qs.set('database', params.database);
    if (params?.schema) qs.set('schema', params.schema);
    if (params?.include_nodes !== undefined) qs.set('include_nodes', String(params.include_nodes));
    if (params?.include_edges !== undefined) qs.set('include_edges', String(params.include_edges));
    if (params?.include_stats !== undefined) qs.set('include_stats', String(params.include_stats));
    const s = qs.toString();
    return apiClient.master.get<{ download_url: string }>(`/mdm-v77/export${s ? `?${s}` : ''}`);
  },
};

export default dataLineageEnhancedApiV77;
