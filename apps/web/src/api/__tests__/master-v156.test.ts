import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataServiceOrchestrationApiV71 } from '../master/dataServiceOrchestrationV71';
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

describe('V156 masterData Data Service Orchestration API bindings', () => {
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

  // ===== 服务定义管理 =====
  describe('Service Definition', () => {
    it('should create service', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.createService({
        name: 'User Data Clean',
        description: 'Clean user data',
        service_type: 'transformation',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/services', {
        name: 'User Data Clean',
        description: 'Clean user data',
        service_type: 'transformation',
      });
    });

    it('should get service by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getService('svc-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/services/svc-1');
    });

    it('should list services with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceOrchestrationApiV71.listServices({
        serviceType: 'integration',
        status: 'published',
        page: 1,
        pageSize: 10,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v71/services?service_type=integration&status=published&page=1&page_size=10'
      );
    });

    it('should list services without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceOrchestrationApiV71.listServices();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/services');
    });

    it('should update service', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.updateService('svc-1', { name: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v71/services/svc-1', { name: 'Updated' });
    });

    it('should remove service', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataServiceOrchestrationApiV71.removeService('svc-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v71/services/svc-1');
    });

    it('should publish service', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.publishService('svc-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/services/svc-1/publish', {});
    });
  });

  // ===== 编排流程管理 =====
  describe('Orchestration Flow', () => {
    const flowData = {
      name: 'Daily Sync',
      description: 'Daily data sync',
      trigger_type: 'scheduled' as const,
      schedule: '0 0 * * *',
      nodes: [{ id: 'n1', type: 'source' as const, name: 'Extract' }],
      edges: [{ source: 'n1', target: 'n2' }],
    };

    it('should create orchestration', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.createOrchestration(flowData);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/orchestrations', flowData);
    });

    it('should get orchestration by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getOrchestration('flow-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1');
    });

    it('should list orchestrations', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceOrchestrationApiV71.listOrchestrations({ status: 'active' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/orchestrations?status=active');
    });

    it('should update orchestration', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.updateOrchestration('flow-1', {
        description: 'Updated',
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1', {
        description: 'Updated',
      });
    });

    it('should remove orchestration', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataServiceOrchestrationApiV71.removeOrchestration('flow-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1');
    });

    it('should activate orchestration', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.activateOrchestration('flow-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1/activate', {});
    });

    it('should deactivate orchestration', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.deactivateOrchestration('flow-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1/deactivate', {});
    });
  });

  // ===== 服务执行/作业管理 =====
  describe('Service Execution', () => {
    it('should execute flow', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.executeFlow('flow-1', {
        input_data: { key: 'value' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1/execute', {
        input_data: { key: 'value' },
      });
    });

    it('should execute flow without data', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.executeFlow('flow-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1/execute', {});
    });

    it('should get execution by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getExecution('exec-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/executions/exec-1');
    });

    it('should list executions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceOrchestrationApiV71.listExecutions({ status: 'failed' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/executions?status=failed');
    });

    it('should cancel execution', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { cancelled: true } });
      await dataServiceOrchestrationApiV71.cancelExecution('exec-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/executions/exec-1/cancel', {});
    });

    it('should retry execution', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.retryExecution('exec-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/executions/exec-1/retry', {});
    });
  });

  // ===== 服务监控与日志 =====
  describe('Service Monitoring & Logs', () => {
    it('should list execution logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataServiceOrchestrationApiV71.listExecutionLogs('exec-1', { level: 'error' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/executions/exec-1/logs?level=error');
    });

    it('should get service metrics', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getServiceMetrics('svc-1', { period: 'day' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/services/svc-1/metrics?period=day');
    });
  });

  // ===== 服务版本管理 =====
  describe('Service Versioning', () => {
    it('should list service versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataServiceOrchestrationApiV71.listServiceVersions('svc-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/services/svc-1/versions');
    });

    it('should create service version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.createServiceVersion('svc-1', {
        changelog: 'Updated',
        configuration: { key: 'value' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/services/svc-1/versions', {
        changelog: 'Updated',
        configuration: { key: 'value' },
      });
    });

    it('should set current version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.setCurrentVersion('svc-1', 'ver-2');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/mdm-v71/services/svc-1/versions/ver-2/set-current',
        {}
      );
    });
  });

  // ===== 服务部署 =====
  describe('Service Deployment', () => {
    it('should deploy service', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.deployService('svc-1', {
        version_id: 'ver-1',
        environment: 'production',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/services/svc-1/deployments', {
        version_id: 'ver-1',
        environment: 'production',
      });
    });

    it('should list deployments', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataServiceOrchestrationApiV71.listDeployments('svc-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/services/svc-1/deployments');
    });

    it('should rollback deployment', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.rollbackDeployment('dep-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v71/deployments/dep-1/rollback', {});
    });
  });

  // ===== 仪表盘 =====
  describe('Dashboard & Statistics', () => {
    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/dashboard');
    });

    it('should get flow statistics', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataServiceOrchestrationApiV71.getFlowStatistics('flow-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v71/orchestrations/flow-1/statistics');
    });
  });
});
