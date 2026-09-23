import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockMonitorClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { monitor: mockMonitorClient },
    default: { monitor: mockMonitorClient },
  };
});

describe('Monitor Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('monitorApi', () => {
    it('getSystemMetrics should call GET /metrics/system', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getSystemMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/metrics/system');
    });

    it('getServiceHealth should call GET /health', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getServiceHealth();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/health');
    });

    it('getApiPerformance should call GET /performance/api', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getApiPerformance();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/performance/api');
    });

    it('getDatabaseMetrics should call GET /metrics/database', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getDatabaseMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/metrics/database');
    });

    it('listAlerts should call GET /alerts with params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.listAlerts({
        page: 1,
        pagesize: 10,
        severity: 'critical',
        status: 'active',
        service_name: 'erp',
      });
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith(
        '/alerts?page=1&pagesize=10&severity=critical&status=active&service_name=erp'
      );
    });

    it('listAlerts should call GET /alerts without params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.listAlerts();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/alerts?');
    });

    it('getAlert should call GET /alerts/:id', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/alerts/alert-001');
    });

    it('acknowledgeAlert should call POST /alerts/:id/acknowledge with note', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.acknowledgeAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.post).toHaveBeenCalledWith('/alerts/alert-001/acknowledge', {
        note: undefined,
      });
    });

    it('resolveAlert should call POST /alerts/:id/resolve with reason', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.resolveAlert('alert-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.post).toHaveBeenCalledWith('/alerts/alert-001/resolve', {
        reason: undefined,
      });
    });

    it('getPerformanceReport should call GET /reports/performance with params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getPerformanceReport('daily', '2024-01-01');
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith(
        '/reports/performance?period_type=daily&period=2024-01-01'
      );
    });

    it('getPerformanceReport should call GET /reports/performance without params', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getPerformanceReport();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/reports/performance?');
    });

    it('getRealtimeMetrics should call GET /metrics/realtime', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.getRealtimeMetrics();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/metrics/realtime');
    });

    it('health should call GET /health', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.health();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/health');
    });

    it('testRetry should call GET /metrics/test-retry', async () => {
      const { monitorApi } = await import('../index');
      await monitorApi.testRetry();
      const { apiClient } = await import('../../client');
      expect(apiClient.monitor.get).toHaveBeenCalledWith('/metrics/test-retry');
    });
  });
});
