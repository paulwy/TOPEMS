import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataProductCatalogApiV72 } from '../master/dataProductCatalogV72';
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

describe('V157 masterData Data Product Catalog API bindings', () => {
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

  // ===== 数据产品管理 =====
  describe('Data Product Management', () => {
    it('should create product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.createProduct({
        name: 'Customer 360 View',
        description: 'Customer comprehensive data view',
        product_type: 'dataset',
        category: 'customer',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products', {
        name: 'Customer 360 View',
        description: 'Customer comprehensive data view',
        product_type: 'dataset',
        category: 'customer',
      });
    });

    it('should get product by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.getProduct('prod-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products/prod-1');
    });

    it('should list products with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataProductCatalogApiV72.listProducts({
        productType: 'dataset',
        category: 'customer',
        status: 'published',
        page: 1,
        pageSize: 10,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v72/products?product_type=dataset&category=customer&status=published&page=1&page_size=10'
      );
    });

    it('should list products without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataProductCatalogApiV72.listProducts();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products');
    });

    it('should update product', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.updateProduct('prod-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v72/products/prod-1', { description: 'Updated' });
    });

    it('should remove product', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataProductCatalogApiV72.removeProduct('prod-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v72/products/prod-1');
    });
  });

  // ===== 产品版本管理 =====
  describe('Product Versioning', () => {
    it('should publish product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.publishProduct('prod-1', {
        version: 'v1.0',
        changelog: 'Initial release',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/publish', {
        version: 'v1.0',
        changelog: 'Initial release',
      });
    });

    it('should list product versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataProductCatalogApiV72.listProductVersions('prod-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products/prod-1/versions');
    });

    it('should create product version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.createProductVersion('prod-1', {
        version: 'v1.1',
        changelog: 'Added fields',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/versions', {
        version: 'v1.1',
        changelog: 'Added fields',
      });
    });

    it('should set current version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.setCurrentVersion('prod-1', 'ver-2');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/mdm-v72/products/prod-1/versions/ver-2/set-current',
        {}
      );
    });
  });

  // ===== 产品生命周期 =====
  describe('Product Lifecycle', () => {
    it('should submit for review', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.submitForReview('prod-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/submit', {});
    });

    it('should approve product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.approveProduct('prod-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/approve', {});
    });

    it('should reject product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.rejectProduct('prod-1', 'Not ready');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/reject', {
        reason: 'Not ready',
      });
    });

    it('should deprecate product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.deprecateProduct('prod-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/deprecate', {});
    });

    it('should archive product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.archiveProduct('prod-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/archive', {});
    });
  });

  // ===== 产品消费者管理 =====
  describe('Consumer Management', () => {
    it('should list product consumers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataProductCatalogApiV72.listProductConsumers('prod-1', { role: 'viewer' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products/prod-1/consumers?role=viewer');
    });

    it('should grant access', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.grantAccess('prod-1', {
        user_id: 'user-1',
        role: 'editor',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/products/prod-1/consumers', {
        user_id: 'user-1',
        role: 'editor',
      });
    });

    it('should revoke access', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { revoked: true } });
      await dataProductCatalogApiV72.revokeAccess('prod-1', 'cons-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v72/products/prod-1/consumers/cons-1');
    });

    it('should update consumer role', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.updateConsumerRole('prod-1', 'cons-1', 'admin');
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/mdm-v72/products/prod-1/consumers/cons-1',
        { role: 'admin' }
      );
    });
  });

  // ===== 产品分析 =====
  describe('Product Analytics', () => {
    it('should get product analytics', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.getProductAnalytics('prod-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products/prod-1/analytics');
    });

    it('should list popular products', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataProductCatalogApiV72.listPopularProducts({ category: 'customer', limit: 5 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/products/popular?category=customer&limit=5');
    });

    it('should get product catalog stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.getProductCatalogStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/stats');
    });
  });

  // ===== 产品组合/捆绑 =====
  describe('Product Bundles', () => {
    it('should create bundle', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.createBundle({
        name: 'Analytics Suite',
        description: 'Analytics data product bundle',
        product_ids: ['prod-1', 'prod-2'],
        pricing_model: 'subscription',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/bundles', {
        name: 'Analytics Suite',
        description: 'Analytics data product bundle',
        product_ids: ['prod-1', 'prod-2'],
        pricing_model: 'subscription',
      });
    });

    it('should get bundle by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.getBundle('bundle-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/bundles/bundle-1');
    });

    it('should list bundles', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataProductCatalogApiV72.listBundles({ status: 'active' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/bundles?status=active');
    });

    it('should update bundle', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.updateBundle('bundle-1', {
        description: 'Updated',
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v72/bundles/bundle-1', {
        description: 'Updated',
      });
    });

    it('should remove bundle', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataProductCatalogApiV72.removeBundle('bundle-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v72/bundles/bundle-1');
    });
  });

  // ===== 标签管理 =====
  describe('Tag Management', () => {
    it('should list tags', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataProductCatalogApiV72.listTags();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v72/tags');
    });

    it('should create tag', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.createTag({ name: 'PII', color: 'red' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v72/tags', {
        name: 'PII',
        color: 'red',
      });
    });

    it('should update tag', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataProductCatalogApiV72.updateTag('tag-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v72/tags/tag-1', {
        description: 'Updated',
      });
    });

    it('should delete tag', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataProductCatalogApiV72.deleteTag('tag-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v72/tags/tag-1');
    });
  });
});
