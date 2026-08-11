import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataLineageEnhancedApiV77 } from '../master/dataLineageEnhancedV77';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    master: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockGet = apiClient.master.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.master.post as ReturnType<typeof vi.fn>;
const mockPut = apiClient.master.put as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.master.patch as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.master.delete as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ===== 数据流向追踪 =====
describe('V162 · 数据血缘 - 数据流向追踪', () => {
  it('获取血缘图谱 - 带参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { nodes: [], edges: [], root_node_id: 'n1', direction: 'downstream', depth: 2, generated_at: '2026-01-01' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getLineageGraph({
      database: 'prod',
      schema: 'public',
      table: 'users',
      direction: 'downstream',
      depth: 3,
    });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/graph?database=prod&schema=public&table=users&direction=downstream&depth=3');
  });

  it('获取血缘图谱 - 最小参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { nodes: [], edges: [], root_node_id: '', direction: 'upstream', depth: 1, generated_at: '2026-01-01' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getLineageGraph({ direction: 'upstream' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/graph?direction=upstream');
  });

  it('获取血缘节点列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.listLineageNodes({ type: 'table', database: 'prod' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/nodes?type=table&database=prod');
  });

  it('获取血缘节点详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'n1', name: 'users', type: 'table' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getLineageNode('n1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/nodes/n1');
  });

  it('获取血缘边列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataLineageEnhancedApiV77.listLineageEdges({ source_id: 'n1' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/edges?source_id=n1');
  });

  it('刷新血缘', async () => {
    mockPost.mockResolvedValueOnce({
      data: { job_id: 'j1', status: 'running' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.refreshLineage({ database: 'prod', force: true });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v77/refresh?database=prod&force=true', {});
  });

  it('获取刷新状态', async () => {
    mockGet.mockResolvedValueOnce({
      data: { job_id: 'j1', status: 'completed', progress: 100, nodes_processed: 500, total_nodes: 500 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getLineageRefreshStatus('j1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/refresh/j1');
  });
});

// ===== 列级血缘分析 =====
describe('V162 · 数据血缘 - 列级血缘分析', () => {
  it('追踪列级血缘', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataLineageEnhancedApiV77.traceColumnLineage({
      database: 'prod',
      schema: 'public',
      table: 'users',
      column: 'email',
      direction: 'downstream',
    });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/column-lineage?database=prod&schema=public&table=users&column=email&direction=downstream');
  });

  it('批量追踪列级血缘', async () => {
    const request = {
      columns: [
        { database: 'prod', schema: 'public', table: 'users', column: 'email' },
        { database: 'prod', schema: 'public', table: 'orders', column: 'total' },
      ],
    };

    mockPost.mockResolvedValueOnce({
      data: { total_requested: 2, completed: 2, failed: 0, results: [] },
      status: 200,
    });

    await dataLineageEnhancedApiV77.batchTraceColumnLineage(request.columns);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v77/column-lineage/batch', request);
  });
});

// ===== 影响分析 =====
describe('V162 · 数据血缘 - 影响分析', () => {
  it('运行影响分析', async () => {
    const request = {
      target: {
        type: 'table' as const,
        database: 'prod',
        schema: 'public',
        name: 'users',
      },
      change_type: 'drop' as const,
      include_indirect: true,
    };

    mockPost.mockResolvedValueOnce({
      data: {
        id: 'i1',
        status: 'completed',
        target: request.target,
        change_type: request.change_type,
        severity: 'critical',
        affected_objects: [],
        affected_count: 10,
        critical_count: 2,
        high_count: 3,
        medium_count: 3,
        low_count: 2,
        execution_time_ms: 1500,
        created_at: '2026-01-01',
      },
      status: 200,
    });

    await dataLineageEnhancedApiV77.runImpactAnalysis(request);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v77/impact-analysis', request);
  });

  it('获取影响分析详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'i1', status: 'completed' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getImpactAnalysis('i1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/impact-analysis/i1');
  });

  it('获取影响分析列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.listImpactAnalyses({ severity: 'critical' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/impact-analysis?severity=critical');
  });

  it('删除影响分析', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataLineageEnhancedApiV77.deleteImpactAnalysis('i1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v77/impact-analysis/i1');
  });
});

// ===== 变更传播路径 =====
describe('V162 · 数据血缘 - 变更传播路径', () => {
  it('获取传播路径', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: 'p1',
        source_node_id: 'n1',
        target_node_id: 'n5',
        path: [],
        total_hops: 3,
        criticality_score: 0.8,
        confidence: 0.95,
      },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getPropagationPath({
      source_node_id: 'n1',
      target_node_id: 'n5',
      max_hops: 5,
    });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/propagation-path?source_node_id=n1&target_node_id=n5&max_hops=5');
  });

  it('批量获取传播路径', async () => {
    const paths = [
      { source_node_id: 'n1', target_node_id: 'n5' },
      { source_node_id: 'n2', target_node_id: 'n8' },
    ];

    mockPost.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataLineageEnhancedApiV77.getMultiplePropagationPaths(paths);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v77/propagation-path/batch', { paths });
  });

  it('获取最短路径', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'p1', total_hops: 2 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.getShortestPath('n1', 'n5');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/shortest-path?source=n1&target=n5');
  });
});

// ===== 血缘差异对比 =====
describe('V162 · 数据血缘 - 血缘差异对比', () => {
  it('对比两个时间点的血缘', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'd1', changes: [], total_changes: 5, generated_at: '2026-01-02' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.compareLineage('2026-01-01', '2026-01-02');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/diff?baseline=2026-01-01&current=2026-01-02');
  });

  it('对比单个节点的血缘变化', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'd1', changes: [], total_changes: 2 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.compareNodeLineage('n1', '2026-01-01', '2026-01-02');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/diff/nodes/n1?baseline=2026-01-01&current=2026-01-02');
  });

  it('获取差异列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataLineageEnhancedApiV77.listLineageDiffs({ from_date: '2026-01-01', severity: 'high' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/diffs?from_date=2026-01-01&severity=high');
  });
});

// ===== 血缘统计 =====
describe('V162 · 数据血缘 - 血缘统计', () => {
  it('获取血缘统计', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_tables: 100,
        total_columns: 2000,
        total_lineage_edges: 5000,
        coverage_rate: 0.85,
        quality_score: 0.9,
        columns_with_lineage: 1700,
        columns_without_lineage: 300,
        tables_with_lineage: 90,
        tables_without_lineage: 10,
        lineage_by_type: {},
        recent_changes_7d: 25,
        top_sources: [],
        top_destinations: [],
        orphan_nodes: 5,
      },
      status: 200,
    });

    const result = await dataLineageEnhancedApiV77.getLineageStats();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/stats');
    expect(result.data.total_tables).toBe(100);
  });

  it('获取血缘覆盖率', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataLineageEnhancedApiV77.getLineageCoverage('prod', 'public');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/coverage?database=prod&schema=public');
  });

  it('获取孤立节点', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataLineageEnhancedApiV77.getOrphanNodes();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/orphans');
  });

  it('修复孤立节点', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', source_id: 'orphan1', target_id: 'target1' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.fixOrphanNode('orphan1', 'target1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v77/orphans/fix', { orphan_node_id: 'orphan1', target_node_id: 'target1' });
  });
});

// ===== 仪表板与导出 =====
describe('V162 · 数据血缘 - 仪表板与导出', () => {
  it('获取血缘仪表板', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        overview: {
          total_nodes: 500,
          total_edges: 2000,
          coverage_rate: 0.85,
          quality_score: 0.9,
          critical_paths: 15,
          last_refresh: '2026-08-26T18:22:00Z',
        },
        lineage_coverage: [],
        impact_summary: {
          total_analyses: 50,
          pending: 3,
          critical_impacts: 5,
          high_impacts: 10,
          avg_analysis_time_ms: 1200,
        },
        recent_impacts: [],
        lineage_health: {
          orphan_nodes: 5,
          disconnected_components: 2,
          avg_quality_score: 0.88,
          confidence_distribution: {},
        },
      },
      status: 200,
    });

    const result = await dataLineageEnhancedApiV77.getLineageDashboard();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/dashboard');
    expect(result.data.overview.total_nodes).toBe(500);
  });

  it('导出血缘报告', async () => {
    mockGet.mockResolvedValueOnce({
      data: { download_url: '/files/lineage-report.json' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.exportLineageReport('json', { database: 'prod' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/export?format=json&database=prod');
  });

  it('导出血缘报告 - PDF格式', async () => {
    mockGet.mockResolvedValueOnce({
      data: { download_url: '/files/lineage-report.pdf' },
      status: 200,
    });

    await dataLineageEnhancedApiV77.exportLineageReport('pdf');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v77/export?format=pdf');
  });
});

// ===== 导出默认值 =====
describe('V162 · 默认导出', () => {
  it('应该导出默认的 api 对象', () => {
    expect(dataLineageEnhancedApiV77).toBeDefined();
    expect(typeof dataLineageEnhancedApiV77.getLineageGraph).toBe('function');
    expect(typeof dataLineageEnhancedApiV77.traceColumnLineage).toBe('function');
    expect(typeof dataLineageEnhancedApiV77.runImpactAnalysis).toBe('function');
    expect(typeof dataLineageEnhancedApiV77.getLineageDashboard).toBe('function');
  });
});
