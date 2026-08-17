import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataAssetCatalogApiV66 } from '../master/dataAssetCatalogV66';
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

describe('V149 masterData Asset Catalog API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    patch: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== 数据资产编目 CRUD =====
  describe('Asset Catalog CRUD', () => {
    it('should create asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.createAsset({
        name: '客户主数据表',
        type: 'table',
        description: '客户基本信息',
        owner: '张三',
        sensitivity: 'confidential',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/assets', {
        name: '客户主数据表',
        type: 'table',
        description: '客户基本信息',
        owner: '张三',
        sensitivity: 'confidential',
      });
    });

    it('should get asset by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.getAsset('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/assets/a-1');
    });

    it('should list assets with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataAssetCatalogApiV66.listAssets({
        type: 'table',
        status: 'active',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/assets?type=table&status=active&page=1&pagesize=20'
      );
    });

    it('should list assets with search and tags', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataAssetCatalogApiV66.listAssets({
        search: '客户',
        tags: ['core', 'master'],
        has_lineage: true,
        has_owner: true,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/assets?tags=core%2Cmaster&q=%E5%AE%A2%E6%88%B7&has_lineage=true&has_owner=true'
      );
    });

    it('should update asset', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.updateAsset('a-1', { description: '更新描述' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v66/assets/a-1', {
        description: '更新描述',
      });
    });

    it('should delete asset', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataAssetCatalogApiV66.deleteAsset('a-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v66/assets/a-1');
    });

    it('should get asset columns', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataAssetCatalogApiV66.getAssetColumns('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/assets/a-1/columns');
    });

    it('should update asset columns', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.updateAssetColumns('a-1', [
        { name: 'id', type: 'uuid', is_primary_key: true },
        { name: 'name', type: 'varchar(255)' },
      ]);
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v66/assets/a-1/columns', {
        columns: [
          { name: 'id', type: 'uuid', is_primary_key: true },
          { name: 'name', type: 'varchar(255)' },
        ],
      });
    });

    it('should bulk update assets', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: { updated: 5 } });
      await dataAssetCatalogApiV66.bulkUpdateAssets({
        asset_ids: ['a-1', 'a-2', 'a-3'],
        status: 'active',
        tags: ['reviewed'],
      });
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v66/assets/bulk', {
        asset_ids: ['a-1', 'a-2', 'a-3'],
        status: 'active',
        tags: ['reviewed'],
      });
    });

    it('should batch delete assets', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { deleted: 3 } });
      await dataAssetCatalogApiV66.batchDeleteAssets(['a-1', 'a-2', 'a-3']);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/assets/bulk-delete', {
        asset_ids: ['a-1', 'a-2', 'a-3'],
      });
    });

    it('should import assets', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { imported: 10, updated: 2, failed: 0 },
      });
      await dataAssetCatalogApiV66.importAssets({
        file_url: '/uploads/assets.csv',
        format: 'csv',
        on_duplicate: 'update',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/assets/import', {
        file_url: '/uploads/assets.csv',
        format: 'csv',
        on_duplicate: 'update',
      });
    });

    it('should export assets', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { download_url: '/exports/assets.json', count: 25 },
      });
      await dataAssetCatalogApiV66.exportAssets({
        type: 'table',
        format: 'json',
        include_lineage: true,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/assets/export?type=table&format=json&include_lineage=true'
      );
    });
  });

  // ===== 数据血缘 =====
  describe('Asset Lineage', () => {
    it('should get lineage graph', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await dataAssetCatalogApiV66.getLineage({
        asset_id: 'a-1',
        direction: 'both',
        depth: 2,
        include_columns: true,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/lineage?asset_id=a-1&direction=both&depth=2&include_columns=true'
      );
    });

    it('should get lineage with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await dataAssetCatalogApiV66.getLineage({
        asset_id: 'a-1',
        direction: 'downstream',
        depth: 3,
        filters: { types: ['table', 'view'], min_confidence: 0.8 },
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/lineage?asset_id=a-1&direction=downstream&depth=3&types=table%2Cview&min_confidence=0.8'
      );
    });

    it('should get upstream lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await dataAssetCatalogApiV66.getLineageUpstream('a-1', 2);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/lineage/upstream?asset_id=a-1&depth=2');
    });

    it('should get downstream lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await dataAssetCatalogApiV66.getLineageDownstream('a-1', 1);
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/lineage/downstream?asset_id=a-1&depth=1'
      );
    });

    it('should get lineage by column', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } });
      await dataAssetCatalogApiV66.getLineageByColumn('a-1', 'customer_id');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/lineage/column?asset_id=a-1&column=customer_id'
      );
    });

    it('should refresh lineage for specific asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { refreshed: 1 } });
      await dataAssetCatalogApiV66.refreshLineage('a-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/lineage/refresh?asset_id=a-1', {});
    });

    it('should refresh all lineage', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { refreshed: 42 } });
      await dataAssetCatalogApiV66.refreshLineage();
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/lineage/refresh', {});
    });
  });

  // ===== 资产标签 =====
  describe('Asset Tags', () => {
    it('should create tag', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.createTag({
        name: '核心数据',
        color: '#FF6B6B',
        category: 'importance',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/tags', {
        name: '核心数据',
        color: '#FF6B6B',
        category: 'importance',
      });
    });

    it('should list tags', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataAssetCatalogApiV66.listTags({ category: 'importance', page: 1, pageSize: 50 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/tags?category=importance&page=1&pagesize=50'
      );
    });

    it('should update tag', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.updateTag('t-1', { color: '#4ECDC4' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v66/tags/t-1', { color: '#4ECDC4' });
    });

    it('should delete tag', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataAssetCatalogApiV66.deleteTag('t-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v66/tags/t-1');
    });

    it('should add tags to asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.addTagsToAsset('a-1', ['t-1', 't-2']);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/assets/a-1/tags', {
        tag_ids: ['t-1', 't-2'],
      });
    });

    it('should remove tags from asset', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.removeTagsFromAsset('a-1', ['t-1']);
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v66/assets/a-1/tags', {
        data: { tag_ids: ['t-1'] },
      });
    });
  });

  // ===== 资产分类 =====
  describe('Asset Categories', () => {
    it('should create category', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.createCategory({
        name: '业务数据',
        code: 'business',
        icon: 'database',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/categories', {
        name: '业务数据',
        code: 'business',
        icon: 'database',
      });
    });

    it('should get category tree', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataAssetCatalogApiV66.getCategoryTree();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/categories/tree');
    });

    it('should list categories', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataAssetCatalogApiV66.listCategories({ parent_id: 'c-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/categories?parent_id=c-1');
    });

    it('should update category', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.updateCategory('c-1', { description: '更新分类描述' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v66/categories/c-1', {
        description: '更新分类描述',
      });
    });

    it('should delete category', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataAssetCatalogApiV66.deleteCategory('c-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v66/categories/c-1');
    });
  });

  // ===== 数据地图 =====
  describe('Data Maps', () => {
    it('should create data map', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.createDataMap({
        name: '客户域数据地图',
        description: '客户相关数据资产全景',
        scope: 'domain',
        domain: 'customer',
        layout: 'hierarchical',
        node_ids: ['a-1', 'a-2'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/maps', {
        name: '客户域数据地图',
        description: '客户相关数据资产全景',
        scope: 'domain',
        domain: 'customer',
        layout: 'hierarchical',
        node_ids: ['a-1', 'a-2'],
      });
    });

    it('should get data map', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.getDataMap('m-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/maps/m-1');
    });

    it('should list data maps', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataAssetCatalogApiV66.listDataMaps({
        scope: 'domain',
        domain: 'customer',
        page: 1,
        pageSize: 10,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/maps?scope=domain&domain=customer&page=1&pagesize=10'
      );
    });

    it('should update data map', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.updateDataMap('m-1', { name: '更新后的客户域地图' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v66/maps/m-1', {
        name: '更新后的客户域地图',
      });
    });

    it('should delete data map', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataAssetCatalogApiV66.deleteDataMap('m-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v66/maps/m-1');
    });

    it('should export data map', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { download_url: '/exports/map.svg', size_kb: 156 },
      });
      await dataAssetCatalogApiV66.exportDataMap('m-1', 'svg');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/maps/m-1/export?format=svg');
    });
  });

  // ===== 资产搜索 =====
  describe('Asset Search', () => {
    it('should search assets with filters', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: {
          assets: [],
          total: 0,
          facets: { by_type: [], by_status: [], by_sensitivity: [], by_owner: [], by_tag: [] },
        },
      });
      await dataAssetCatalogApiV66.searchAssets({
        query: '客户',
        filters: { types: ['table'], sensitivities: ['confidential'] },
        sort: { field: 'updated_at', order: 'desc' },
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v66/search', {
        query: '客户',
        filters: { types: ['table'], sensitivities: ['confidential'] },
        sort: { field: 'updated_at', order: 'desc' },
        page: 1,
        pageSize: 20,
      });
    });

    it('should quick search assets', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: {
          assets: [],
          total: 0,
          facets: { by_type: [], by_status: [], by_sensitivity: [], by_owner: [], by_tag: [] },
        },
      });
      await dataAssetCatalogApiV66.quickSearch('订单', 10);
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/search/quick?q=%E8%AE%A2%E5%8D%95&limit=10'
      );
    });

    it('should get search suggestions', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: ['客户主数据', '客户画像', '客户标签'],
      });
      await dataAssetCatalogApiV66.getSearchSuggestions('客户');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v66/search/suggestions?prefix=%E5%AE%A2%E6%88%B7'
      );
    });
  });

  // ===== 仪表盘 =====
  describe('Dashboard', () => {
    it('should get dashboard overview', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataAssetCatalogApiV66.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/dashboard');
    });

    it('should get recent assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataAssetCatalogApiV66.getRecentAssets(5);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/dashboard/recent?limit=5');
    });

    it('should get orphan assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataAssetCatalogApiV66.getOrphanAssets();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v66/dashboard/orphans');
    });
  });
});
