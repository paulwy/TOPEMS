import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockEhsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { ehs: mockEhsClient },
    default: { ehs: mockEhsClient },
  };
});

describe('EHS Health Monitoring API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('healthMonitoringApi - 健康记录', () => {
    it('listHealthRecords should call GET with params', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await healthMonitoringApi.listHealthRecords({
        page: 1,
        page_size: 10,
        status: 'normal',
        check_type: 'annual',
        employee_id: 'emp-001',
        keyword: 'test',
      });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/health-monitor?page=1&page_size=10&status=normal&check_type=annual&employee_id=emp-001&q=test'
      );
    });

    it('listHealthRecords should call GET without params', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await healthMonitoringApi.listHealthRecords();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/health-monitor');
    });

    it('getHealthRecord should call GET /health-monitor/:id', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await healthMonitoringApi.getHealthRecord('rec-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/health-monitor/rec-001');
    });

    it('createHealthRecord should call GET with query data', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      const data = { employee_name: '张三', check_type: 'annual', status: 'normal' };
      await healthMonitoringApi.createHealthRecord(data);
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/health-monitor', { params: data });
    });

    it('updateHealthRecord should call PUT /health-monitor/:id', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'abnormal', result: '需要复查' };
      await healthMonitoringApi.updateHealthRecord('rec-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/health-monitor/rec-001', data);
    });

    it('deleteHealthRecord should call DELETE /health-monitor/:id', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await healthMonitoringApi.deleteHealthRecord('rec-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/health-monitor/rec-001');
    });

    it('getHealthStatistics should call GET /health-monitor/statistics', async () => {
      const { healthMonitoringApi } = await import('../ehs/healthMonitoring');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await healthMonitoringApi.getHealthStatistics();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/health-monitor/statistics');
    });
  });
});
