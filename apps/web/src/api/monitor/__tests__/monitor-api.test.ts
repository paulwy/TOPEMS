import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockMasterClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { master: mockMasterClient },
    default: { master: mockMasterClient },
  };
});

describe('Monitor Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('monitorApi', () => {
    it('getSystemMetrics should call GET /monitor/metrics/system', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getSystemMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/metrics/system');
    });

    it('getServiceHealth should call GET /monitor/health', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getServiceHealth();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/health');
    });

    it('getApiPerformance should call GET /monitor/performance/api', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getApiPerformance();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/performance/api');
    });

    it('getDatabaseMetrics should call GET /monitor/metrics/database', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getDatabaseMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/metrics/database');
    });

    it('listAlerts should call GET /monitor/alerts with params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.listAlerts({
        page: 1,
        pagesize: 10,
        severity: 'critical',
        status: 'active',
        service_name: 'erp',
      });
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith(
        '/monitor/alerts?page=1&pagesize=10&severity=critical&status=active&service_name=erp'
      );
    });

    it('listAlerts should call GET /monitor/alerts without params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.listAlerts();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/alerts?');
    });

    it('getAlert should call GET /monitor/alerts/:id', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/alerts/alert-001');
    });

    it('acknowledgeAlert should call PUT /monitor/alerts/:id/acknowledge', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.acknowledgeAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.master.put).toHaveBeenCalledWith('/monitor/alerts/alert-001/acknowledge');
    });

    it('resolveAlert should call PUT /monitor/alerts/:id/resolve', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.resolveAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.master.put).toHaveBeenCalledWith('/monitor/alerts/alert-001/resolve');
    });

    it('getPerformanceReport should call GET /monitor/reports/performance with params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getPerformanceReport('daily', '2024-01-01');
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith(
        '/monitor/reports/performance?period_type=daily&period=2024-01-01'
      );
    });

    it('getPerformanceReport should call GET /monitor/reports/performance without params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getPerformanceReport();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/reports/performance?');
    });

    it('getRealtimeMetrics should call GET /monitor/metrics/realtime', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getRealtimeMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/metrics/realtime');
    });

    it('health should call GET /health', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.health();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/health');
    });

    it('testRetry should call GET /monitor/metrics/test-retry', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.testRetry();
      const { apiClient } = await import('../../client');
      expect(apiClient.master.get).toHaveBeenCalledWith('/monitor/metrics/test-retry');
    });
  });
});
