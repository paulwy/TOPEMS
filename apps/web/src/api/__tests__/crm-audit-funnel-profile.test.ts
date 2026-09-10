import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockCrmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { crm: mockCrmClient },
    default: { crm: mockCrmClient },
  };
});

describe('CRM Audit API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crmAuditApi', () => {
    it('listAuditLogs should call GET with all params', async () => {
      const { crmAuditApi } = await import('../crm/crmAudit');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await crmAuditApi.listAuditLogs({
        page: 1,
        page_size: 20,
        action: 'create',
        entity_type: 'customer',
        user_id: 'user-001',
        status: 'success',
        start_date: '2026-01-01',
        end_date: '2026-08-27',
      });
      expect(apiClient.crm.get).toHaveBeenCalledWith(
        '/audit-logs?page=1&page_size=20&action=create&entity_type=customer&user_id=user-001&status=success&start_date=2026-01-01&end_date=2026-08-27'
      );
    });

    it('listAuditLogs should call GET without params', async () => {
      const { crmAuditApi } = await import('../crm/crmAudit');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await crmAuditApi.listAuditLogs();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/audit-logs');
    });

    it('getAuditLog should call GET /audit-logs/:id', async () => {
      const { crmAuditApi } = await import('../crm/crmAudit');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: {} });
      await crmAuditApi.getAuditLog('log-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/audit-logs/log-001');
    });
  });
});

describe('CRM Sales Funnel API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('salesFunnelApi', () => {
    it('getFunnelData should call GET with params', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await salesFunnelApi.getFunnelData({ period_type: 'month', start_date: '2026-01-01' });
      expect(apiClient.crm.get).toHaveBeenCalledWith(
        '/sales-funnel?period_type=month&start_date=2026-01-01'
      );
    });

    it('getFunnelData should call GET without params', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await salesFunnelApi.getFunnelData();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-funnel');
    });

    it('getFunnelMetrics should call GET /sales-funnel/metrics', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: {} });
      await salesFunnelApi.getFunnelMetrics({ period_type: 'quarter' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-funnel/metrics?period_type=quarter');
    });

    it('getFunnelConversion should call GET /sales-funnel/conversion', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await salesFunnelApi.getFunnelConversion();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-funnel/conversion');
    });

    it('getFunnelTrend should call GET /sales-funnel/trend', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await salesFunnelApi.getFunnelTrend({ start_date: '2026-01-01' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-funnel/trend?start_date=2026-01-01');
    });

    it('getStageOpportunities should call GET /sales-funnel/stage/:stage', async () => {
      const { salesFunnelApi } = await import('../crm/salesFunnel');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await salesFunnelApi.getStageOpportunities('negotiation', { page: 1 });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-funnel/stage/negotiation?page=1');
    });
  });
});

