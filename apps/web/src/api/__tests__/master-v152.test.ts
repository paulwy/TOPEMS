import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commercialApiV55 } from '../master/commercialV55';
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

describe('V152 masterData Commercial API bindings', () => {
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

  // ===== API 商业化 - 产品管理 =====
  describe('Product Management', () => {
    it('should create API product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.createAPIProduct({ name: '企业版API', tier: 'enterprise' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/products', {
        name: '企业版API',
        tier: 'enterprise',
      });
    });

    it('should list API products', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.listAPIProducts();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/products');
    });

    it('should get API product by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getAPIProduct('prod-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/products/prod-1');
    });

    it('should list API products paginated', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await commercialApiV55.listAPIProductsPaginated({ page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/products/paginated?page=1&page_size=10'
      );
    });

    it('should update API product', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.updateAPIProduct('prod-1', { name: '新版本' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/products/prod-1', { name: '新版本' });
    });

    it('should delete API product', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await commercialApiV55.deleteAPIProduct('prod-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v55/products/prod-1');
    });
  });

  // ===== API 商业化 - 订阅管理 =====
  describe('Subscription Management', () => {
    it('should subscribe tenant', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.subscribeTenant({ api_product_id: 'prod-1', tenant_id: 't-1' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/subscribe', {
        api_product_id: 'prod-1',
        tenant_id: 't-1',
      });
    });

    it('should list subscriptions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.listSubscriptions({ tenant_id: 't-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/subscriptions?tenant_id=t-1');
    });

    it('should list subscriptions without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.listSubscriptions();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/subscriptions');
    });

    it('should get subscription by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getSubscription('sub-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/subscriptions/sub-1');
    });

    it('should cancel subscription', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.cancelSubscription('sub-1');
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/subscriptions/sub-1/cancel', {});
    });

    it('should upgrade tier', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.upgradeTier('sub-1', { tier: 'professional' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/subscriptions/sub-1/upgrade', {
        tier: 'professional',
      });
    });

    it('should update subscription', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.updateSubscription('sub-1', { tier: 'basic' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/subscriptions/sub-1', {
        tier: 'basic',
      });
    });
  });

  // ===== 计量计费 - 使用记录 =====
  describe('Usage Records', () => {
    it('should record usage', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.recordUsage({
        tenant_id: 't-1',
        api_product_id: 'prod-1',
        endpoint: '/api/data',
        requests: 100,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/usage/record', {
        tenant_id: 't-1',
        api_product_id: 'prod-1',
        endpoint: '/api/data',
        requests: 100,
      });
    });

    it('should get usage summary', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getUsageSummary({
        tenant_id: 't-1',
        start_time: '2026-08-01',
        end_time: '2026-08-31',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/usage/summary?tenant_id=t-1&start_time=2026-08-01&end_time=2026-08-31'
      );
    });

    it('should list usage records', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await commercialApiV55.listUsageRecords({ tenant_id: 't-1', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/usage/records?tenant_id=t-1&page=1&page_size=20'
      );
    });
  });

  // ===== 计量计费 - 账单管理 =====
  describe('Billing Management', () => {
    it('should generate bill', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.generateBill({ tenant_id: 't-1' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/bill/generate', { tenant_id: 't-1' });
    });

    it('should get billing history', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await commercialApiV55.getBillingHistory({ tenant_id: 't-1', page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/billing?tenant_id=t-1&page=1&page_size=10'
      );
    });

    it('should mark bill as paid', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.markBillPaid('bill-1');
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/billing/bill-1/mark-paid', {});
    });

    it('should get billing by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getBilling('bill-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/billing/bill-1');
    });
  });

  // ===== 计量计费 - 费率卡 =====
  describe('Rate Card', () => {
    it('should create rate card', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.createRateCard({
        tier: 'basic',
        cost_per_request: 0.01,
        cost_per_mb: 0.5,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/rate-cards', {
        tier: 'basic',
        cost_per_request: 0.01,
        cost_per_mb: 0.5,
      });
    });

    it('should get rate cards', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.getRateCards();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/rate-cards');
    });

    it('should update rate card', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.updateRateCard('rc-1', {
        tier: 'basic',
        cost_per_request: 0.02,
        cost_per_mb: 0.5,
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/rate-cards/rc-1', {
        tier: 'basic',
        cost_per_request: 0.02,
        cost_per_mb: 0.5,
      });
    });

    it('should delete rate card', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await commercialApiV55.deleteRateCard('rc-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v55/rate-cards/rc-1');
    });
  });

  // ===== SLA 保障 - 配置与度量 =====
  describe('SLA Configuration & Measurement', () => {
    it('should configure SLA', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.configureSLA({ metric: 'availability', target_value: 99.9 });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/sla/configure', {
        metric: 'availability',
        target_value: 99.9,
      });
    });

    it('should measure SLA', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.measureSLA({
        config_id: 'cfg-1',
        tenant_id: 't-1',
        measured_value: 99.95,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/sla/measure', {
        config_id: 'cfg-1',
        tenant_id: 't-1',
        measured_value: 99.95,
      });
    });

    it('should get SLA status', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { sla_statuses: [] } });
      await commercialApiV55.getSLAStatus({ tenant_id: 't-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/sla/status?tenant_id=t-1');
    });

    it('should get SLA history', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.getSLAHistory({ config_id: 'cfg-1', tenant_id: 't-1' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/sla/history?tenant_id=t-1&config_id=cfg-1'
      );
    });

    it('should calculate penalty', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.calculatePenalty('cfg-1', 't-1');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/sla/penalty?config_id=cfg-1&tenant_id=t-1'
      );
    });
  });

  // ===== SLA 保障 - 事故管理 =====
  describe('SLA Incident Management', () => {
    it('should create incident', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.createIncident({
        config_id: 'cfg-1',
        tenant_id: 't-1',
        incident_type: 'downtime',
        duration_min: 30,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v55/sla/incident', {
        config_id: 'cfg-1',
        tenant_id: 't-1',
        incident_type: 'downtime',
        duration_min: 30,
      });
    });

    it('should get incidents', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await commercialApiV55.getIncidents({ tenant_id: 't-1', status: 'open' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v55/sla/incidents?tenant_id=t-1&status=open'
      );
    });

    it('should generate SLA report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.generateSLAReport({ tenant_id: 't-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/sla/report?tenant_id=t-1');
    });

    it('should get incident by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getIncident('inc-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/sla/incidents/inc-1');
    });

    it('should update incident', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.updateIncident('inc-1', { status: 'resolved' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v55/sla/incidents/inc-1', {
        status: 'resolved',
      });
    });

    it('should get SLA dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await commercialApiV55.getSLADashboard({ tenant_id: 't-1' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v55/sla/dashboard?tenant_id=t-1');
    });
  });
});
