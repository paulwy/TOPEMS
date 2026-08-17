import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marketplaceApiV69 } from '../master/dataMarketplaceV69';
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

describe('V154 masterData Marketplace API bindings', () => {
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

  // ===== 数据资产目录 CRUD =====
  describe('Asset Catalog', () => {
    it('should publish asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.publishAsset({
        name: 'Customer Dataset',
        category: 'dataset',
        description: 'Customer master data',
        pricing: 'free',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/assets', {
        name: 'Customer Dataset',
        category: 'dataset',
        description: 'Customer master data',
        pricing: 'free',
      });
    });

    it('should get asset by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getAsset('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1');
    });

    it('should list assets with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listAssets({
        category: 'dataset',
        status: 'published',
        page: 2,
        pageSize: 15,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/assets?category=dataset&status=published&page=2&page_size=15'
      );
    });

    it('should list assets without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listAssets();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets');
    });

    it('should update asset', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.updateAsset('asset-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v69/assets/asset-1', {
        description: 'Updated',
      });
    });

    it('should remove asset', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await marketplaceApiV69.removeAsset('asset-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v69/assets/asset-1');
    });

    it('should search assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.searchAssets('customer', { category: 'dataset', minRating: 3 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/assets/search?q=customer&category=dataset&min_rating=3'
      );
    });
  });

  // ===== 资产版本管理 =====
  describe('Asset Versions', () => {
    it('should list asset versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.listAssetVersions('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/versions');
    });

    it('should publish new version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.publishNewVersion('asset-1', {
        version: 'v1.1',
        changelog: 'Added fields',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/versions', {
        version: 'v1.1',
        changelog: 'Added fields',
      });
    });

    it('should get specific asset version', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getAssetVersion('asset-1', 'v1.0');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/versions/v1.0');
    });
  });

  // ===== 订阅管理 =====
  describe('Subscriptions', () => {
    it('should subscribe to asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.subscribe({ asset_id: 'asset-1', plan: 'basic' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/subscriptions', {
        asset_id: 'asset-1',
        plan: 'basic',
      });
    });

    it('should list subscriptions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listSubscriptions({ status: 'active', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/subscriptions?status=active&page=1&page_size=20'
      );
    });

    it('should get subscription by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getSubscription('sub-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/subscriptions/sub-1');
    });

    it('should cancel subscription', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { cancelled: true } });
      await marketplaceApiV69.cancelSubscription('sub-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/subscriptions/sub-1/cancel', {});
    });

    it('should renew subscription', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.renewSubscription('sub-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/subscriptions/sub-1/renew', {});
    });

    it('should upgrade subscription', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.upgradeSubscription('sub-1', { new_plan: 'premium' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/subscriptions/sub-1/upgrade', {
        new_plan: 'premium',
      });
    });
  });

  // ===== 评价管理 =====
  describe('Reviews', () => {
    it('should write review', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.writeReview({ asset_id: 'asset-1', rating: 5, comment: 'Great' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/reviews', {
        asset_id: 'asset-1',
        rating: 5,
        comment: 'Great',
      });
    });

    it('should list asset reviews', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listAssetReviews('asset-1', { minRating: 4, page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/assets/asset-1/reviews?min_rating=4&page=1&page_size=10'
      );
    });

    it('should delete review', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await marketplaceApiV69.deleteReview('review-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v69/reviews/review-1');
    });
  });

  // ===== 定价管理 =====
  describe('Pricing', () => {
    it('should get asset pricing', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.getAssetPricing('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/pricing');
    });

    it('should update asset pricing', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.updateAssetPricing('asset-1', {
        model: 'tiered',
        tiers: [{ name: 'basic', limit: 1000, price: 10 }],
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/pricing', {
        model: 'tiered',
        tiers: [{ name: 'basic', limit: 1000, price: 10 }],
      });
    });
  });

  // ===== 服务商管理 =====
  describe('Providers', () => {
    it('should create provider', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.createProvider({ name: 'Acme Data', contact_email: 'ops@acme.com' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/providers', {
        name: 'Acme Data',
        contact_email: 'ops@acme.com',
      });
    });

    it('should get provider by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getProvider('prov-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/providers/prov-1');
    });

    it('should list providers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listProviders({ status: 'verified', search: 'acme' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/providers?status=verified&q=acme');
    });

    it('should verify provider', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.verifyProvider('prov-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/providers/prov-1/verify', {});
    });

    it('should suspend provider', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.suspendProvider('prov-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/providers/prov-1/suspend', {});
    });

    it('should get provider assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.getProviderAssets('prov-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/providers/prov-1/assets');
    });
  });

  // ===== 使用量统计与仪表盘 =====
  describe('Usage & Dashboard', () => {
    it('should get asset usage stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getAssetUsageStats('asset-1', { period: 'week' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/stats?period=week');
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await marketplaceApiV69.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/dashboard');
    });
  });

  // ===== 收藏与推荐 =====
  describe('Favorites & Recommendations', () => {
    it('should add favorite', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { saved: true } });
      await marketplaceApiV69.addFavorite('asset-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v69/favorites', { asset_id: 'asset-1' });
    });

    it('should remove favorite', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { removed: true } });
      await marketplaceApiV69.removeFavorite('asset-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v69/favorites/asset-1');
    });

    it('should list favorites', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listFavorites({ page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/favorites?page=1&page_size=10');
    });

    it('should get featured assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.getFeaturedAssets({ category: 'dataset', limit: 5 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/assets/featured?category=dataset&limit=5'
      );
    });

    it('should get recommendations', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.getRecommendations('asset-1', 3);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/assets/asset-1/recommend?limit=3');
    });

    it('should list categories', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await marketplaceApiV69.listCategories();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v69/categories');
    });

    it('should list recently updated assets', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await marketplaceApiV69.listRecentlyUpdated({ days: 7, page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v69/assets/recent?days=7&page=1&page_size=20'
      );
    });
  });
});
