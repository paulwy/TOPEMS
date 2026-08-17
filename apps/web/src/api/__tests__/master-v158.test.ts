import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataServiceMarketplaceApiV73 } from '../master/dataServiceMarketplaceV73';
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

describe('V158 masterData Data Service Marketplace API bindings', () => {
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

  // ===== 服务上架管理 =====
  describe('Listing Management', () => {
    it('should create listing', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.createListing({
        service_id: 'svc-1',
        title: 'Data Cleaning Service',
        description: 'Clean your data with AI',
        category: 'data_quality',
        pricing_model: 'pay_per_use',
        price_per_use: 0.5,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/listings', {
        service_id: 'svc-1',
        title: 'Data Cleaning Service',
        description: 'Clean your data with AI',
        category: 'data_quality',
        pricing_model: 'pay_per_use',
        price_per_use: 0.5,
      });
    });

    it('should get listing by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getListing('list-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/listings/list-1');
    });

    it('should list listings with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listListings({
        category: 'analytics',
        status: 'published',
        sort: 'popular',
        page: 1,
        pageSize: 12,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v73/listings?category=analytics&status=published&sort=popular&page=1&page_size=12'
      );
    });

    it('should list listings without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listListings();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/listings');
    });

    it('should update listing', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.updateListing('list-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v73/listings/list-1', {
        description: 'Updated',
      });
    });

    it('should remove listing', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataServiceMarketplaceApiV73.removeListing('list-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v73/listings/list-1');
    });

    it('should publish listing', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.publishListing('list-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/listings/list-1/publish', {});
    });

    it('should suspend listing', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.suspendListing('list-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/listings/list-1/suspend', {});
    });
  });

  // ===== 市场交易/订单 =====
  describe('Order Management', () => {
    it('should create order', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.createOrder({
        listing_id: 'list-1',
        billing_cycle: 'monthly',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders', {
        listing_id: 'list-1',
        billing_cycle: 'monthly',
      });
    });

    it('should get order by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getOrder('order-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/orders/order-1');
    });

    it('should list orders', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listOrders({ status: 'paid', buyerId: 'user-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/orders?status=paid&buyer_id=user-1');
    });

    it('should pay order', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.payOrder('order-1', { payment_method: 'alipay' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders/order-1/pay', {
        payment_method: 'alipay',
      });
    });

    it('should complete order', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.completeOrder('order-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders/order-1/complete', {});
    });

    it('should cancel order', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.cancelOrder('order-1', 'Changed my mind');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders/order-1/cancel', {
        reason: 'Changed my mind',
      });
    });

    it('should refund order', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.refundOrder('order-1', 'Service not working');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders/order-1/refund', {
        reason: 'Service not working',
      });
    });
  });

  // ===== 支付与结算 =====
  describe('Payment & Settlement', () => {
    it('should get payment by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getPayment('pay-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/payments/pay-1');
    });

    it('should list payments', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listPayments({ status: 'success' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/payments?status=success');
    });

    it('should issue invoice', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.issueInvoice('order-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/orders/order-1/invoice', {});
    });

    it('should get invoice by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getInvoice('inv-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/invoices/inv-1');
    });

    it('should list invoices', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listInvoices({ type: 'sale', status: 'pending' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/invoices?type=sale&status=pending');
    });
  });

  // ===== 市场评价 =====
  describe('Reviews', () => {
    it('should write review', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.writeReview('list-1', {
        rating: 5,
        comment: 'Excellent service!',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/listings/list-1/reviews', {
        rating: 5,
        comment: 'Excellent service!',
      });
    });

    it('should list listing reviews', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.listListingReviews('list-1', { rating: 5 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/listings/list-1/reviews?rating=5');
    });

    it('should reply to review', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.replyReview('list-1', 'rev-1', {
        reply: 'Thank you for the review!',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v73/listings/list-1/reviews/rev-1/reply', {
        reply: 'Thank you for the review!',
      });
    });

    it('should delete review', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataServiceMarketplaceApiV73.deleteReview('list-1', 'rev-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v73/listings/list-1/reviews/rev-1');
    });
  });

  // ===== 市场发现与推荐 =====
  describe('Discovery & Recommendations', () => {
    it('should get featured listings', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataServiceMarketplaceApiV73.getFeaturedListings({ category: 'ml', limit: 6 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/listings/featured?category=ml&limit=6');
    });

    it('should search listings', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceMarketplaceApiV73.searchListings('data cleaning', {
        category: 'data_quality',
        minRating: 4,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v73/listings/search?q=data+cleaning&category=data_quality&min_rating=4'
      );
    });

    it('should get similar listings', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataServiceMarketplaceApiV73.getSimilarListings('list-1', 5);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/listings/list-1/similar?limit=5');
    });

    it('should list categories', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataServiceMarketplaceApiV73.listCategories();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/categories');
    });
  });

  // ===== 市场统计仪表板 =====
  describe('Dashboard & Stats', () => {
    it('should get marketplace dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/dashboard');
    });

    it('should get seller stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getSellerStats('user-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/sellers/user-1/stats');
    });

    it('should get buyer stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceMarketplaceApiV73.getBuyerStats('user-2');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v73/buyers/user-2/stats');
    });
  });
});
