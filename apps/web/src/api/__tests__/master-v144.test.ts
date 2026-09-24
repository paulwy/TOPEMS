import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  disasterRecoveryApi,
  knowledgeGraphApi,
  semanticSearchApi,
  versioningApi,
} from '../master';
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

describe('V144 masterData API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Disaster Recovery =====
  describe('disasterRecoveryApi', () => {
    it('should create recovery point', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'rp-1' } });
      const res = await disasterRecoveryApi.createRecoveryPoint({ name: 'Daily snapshot' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v56/recovery/point', {
        name: 'Daily snapshot',
      });
      expect(res.data.id).toBe('rp-1');
    });

    it('should list recovery points', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await disasterRecoveryApi.listRecoveryPoints({ page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v56/recovery/points?page=1&page_size=20');
    });

    it('should execute recovery plan', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'pl-1', status: 'running' } });
      await disasterRecoveryApi.executeRecoveryPlan();
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v56/recovery/plan/execute', {});
    });

    it('should get region health', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await disasterRecoveryApi.getRegionHealth();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v56/dr/region-health');
    });
  });

  // ===== Knowledge Graph =====
  describe('knowledgeGraphApi', () => {
    it('should add node', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'n-1' } });
      await knowledgeGraphApi.addNode({ label: 'Customer', type: 'entity' });
      expect(mockClient.post).toHaveBeenCalledWith('/kg-v53/nodes', {
        label: 'Customer',
        type: 'entity',
      });
    });

    it('should add edge', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'e-1' } });
      await knowledgeGraphApi.addEdge({ from_node: 'n-1', to_node: 'n-2', relation: 'depends_on' });
      expect(mockClient.post).toHaveBeenCalledWith('/kg-v53/edges', {
        from_node: 'n-1',
        to_node: 'n-2',
        relation: 'depends_on',
      });
    });

    it('should find path between nodes', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await knowledgeGraphApi.findPath({ from: 'a', to: 'b', max_depth: 5 });
      expect(mockClient.get).toHaveBeenCalledWith('/kg-v53/path?from=a&to=b&max_depth=5');
    });

    it('should search assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await knowledgeGraphApi.searchAssets({ query: 'report', page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith('/kg-v53/assets?q=report&page=1&page_size=10');
    });

    it('should get recommendations', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await knowledgeGraphApi.getRecommendations('user-1');
      expect(mockClient.get).toHaveBeenCalledWith('/kg-v53/recommendations/user-1');
    });

    it('should export knowledge graph', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { format: 'json' } });
      await knowledgeGraphApi.exportKg({ format: 'json', scope: 'full' });
      expect(mockClient.get).toHaveBeenCalledWith('/kg-v53/export?format=json&scope=full');
    });
  });

  // ===== Semantic Search =====
  describe('semanticSearchApi', () => {
    it('should search semantic', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await semanticSearchApi.searchSemantic({ query: 'revenue', limit: 10 });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v57/search/semantic', {
        query: 'revenue',
        limit: 10,
      });
    });

    it('should search hybrid', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await semanticSearchApi.searchHybrid({ query: 'revenue', semantic_weight: 0.7 });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v57/search/hybrid', {
        query: 'revenue',
        semantic_weight: 0.7,
      });
    });

    it('should index entity', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { indexed: true } });
      await semanticSearchApi.indexEntity({
        entity_type: 'document',
        entity_id: 'doc-1',
        text: 'Revenue report',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v57/search/index', {
        entity_type: 'document',
        entity_id: 'doc-1',
        text: 'Revenue report',
      });
    });

    it('should auto-tag entity', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await semanticSearchApi.autoTag({
        entity_type: 'document',
        entity_id: 'doc-1',
        strategy: 'hybrid',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v57/tag/auto', {
        entity_type: 'document',
        entity_id: 'doc-1',
        strategy: 'hybrid',
      });
    });

    it('should compute embeddings', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { embeddings: [[0.1, 0.2]], model: 'bge' },
      });
      await semanticSearchApi.computeEmbeddings({ texts: ['hello'], model: 'bge' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v57/graph/embeddings', {
        texts: ['hello'],
        model: 'bge',
      });
    });

    it('should get search stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { indexed_entities: 100 } });
      await semanticSearchApi.getSearchStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v57/search/stats');
    });

    it('should list tags', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await semanticSearchApi.listTags({ query: 'finance' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v57/tags?q=finance');
    });
  });

  // ===== Versioning =====
  describe('versioningApi', () => {
    it('should create snapshot', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'snap-1' } });
      await versioningApi.createSnapshot({
        entity_type: 'customer',
        entity_id: 'c-1',
        snapshot_type: 'full',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/version/snapshot', {
        entity_type: 'customer',
        entity_id: 'c-1',
        snapshot_type: 'full',
      });
    });

    it('should diff versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { additions: 2, deletions: 0 } });
      await versioningApi.diffVersions({
        entity_type: 'customer',
        entity_id: 'c-1',
        from_version: 'v1',
        to_version: 'v2',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/version/diff?entity_type=customer&entity_id=c-1&from=v1&to=v2'
      );
    });

    it('should query audit log', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await versioningApi.queryAuditLog({
        entity_type: 'customer',
        entity_id: 'c-1',
        page: 1,
        pageSize: 50,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/audit/log?entity_type=customer&entity_id=c-1&page=1&page_size=50'
      );
    });

    it('should grant permission', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'perm-1' } });
      await versioningApi.grantPermission({
        user_id: 'u-1',
        resource_type: 'customer',
        action: 'write',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/permissions/grant', {
        user_id: 'u-1',
        resource_type: 'customer',
        action: 'write',
      });
    });

    it('should check permission', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { allowed: true } });
      await versioningApi.checkPermission({
        user_id: 'u-1',
        resource_type: 'customer',
        action: 'read',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/permissions/check?user_id=u-1&resource_type=customer&action=read'
      );
    });

    it('should create role', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'role-1' } });
      await versioningApi.createRole({ name: 'Data Steward', permissions: [] });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/roles', {
        name: 'Data Steward',
        permissions: [],
      });
    });

    it('should restore version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await versioningApi.restoreVersion({
        entity_type: 'customer',
        entity_id: 'c-1',
        version: 'v1',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/version/restore', {
        entity_type: 'customer',
        entity_id: 'c-1',
        version: 'v1',
      });
    });
  });
});
