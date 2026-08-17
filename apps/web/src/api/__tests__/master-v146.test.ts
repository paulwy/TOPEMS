import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataContractApiV61, apiLifecycleApiV62 } from '../master';
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

describe('V146 masterData API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Data Contract V61 =====
  describe('dataContractApiV61', () => {
    it('should create contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.createContract({
        name: 'test-contract',
        type: 'schema',
        source_system: 'erp',
        target_system: 'wms',
        schema: { fields: [] },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts', {
        name: 'test-contract',
        type: 'schema',
        source_system: 'erp',
        target_system: 'wms',
        schema: { fields: [] },
      });
    });

    it('should get contract', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.getContract('c-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/contracts/c-1');
    });

    it('should list contracts with pagination', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataContractApiV61.listContract({ page: 2, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/contracts?page=2&pagesize=20');
    });

    it('should update contract', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.updateContract('c-1', { description: 'updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v61/contracts/c-1', {
        description: 'updated',
      });
    });

    it('should delete contract', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataContractApiV61.deleteContract('c-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v61/contracts/c-1');
    });

    it('should publish contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.publishContract('c-1', { changelog: 'init' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/publish', {
        changelog: 'init',
      });
    });

    it('should deprecate contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.deprecateContract('c-1', { reason: 'replaced' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/deprecate', {
        reason: 'replaced',
      });
    });

    it('should restore contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.restoreContract('c-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/restore', {});
    });

    it('should list versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataContractApiV61.listVersions('c-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/versions');
    });

    it('should rollback version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.rollbackVersion('c-1', 'v2');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/rollback', {
        version: 'v2',
      });
    });

    it('should diff versions', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { added: [], removed: [], modified: [] },
      });
      await dataContractApiV61.diffVersions('c-1', 'v1', 'v2');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/diff?from=v1&to=v2');
    });

    it('should bind entity', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.bindEntity('c-1', {
        entity_type: 'customer',
        entity_id: 'x-1',
        direction: 'producer',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/bind', {
        entity_type: 'customer',
        entity_id: 'x-1',
        direction: 'producer',
      });
    });

    it('should unbind entity', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { unbound: true } });
      await dataContractApiV61.unbindEntity('c-1', 'b-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/unbind/b-1', {});
    });

    it('should validate contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { valid: true, issues: [] } });
      await dataContractApiV61.validateContract('c-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/validate', {});
    });

    it('should test contract', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { passed: true, latency_ms: 10, errors: [] },
      });
      await dataContractApiV61.testContract('c-1', { id: 'x' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/c-1/test', { id: 'x' });
    });

    it('should list violations', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataContractApiV61.listViolations({ status: 'open' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/violations?status=open');
    });

    it('should resolve violation', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.resolveViolation('v-1', { resolution: 'fixed' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/violations/v-1/resolve', {
        resolution: 'fixed',
      });
    });

    it('should generate contract', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataContractApiV61.generateContract({
        source_system: 'erp',
        target_system: 'wms',
        entity_type: 'order',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v61/contracts/generate', {
        source_system: 'erp',
        target_system: 'wms',
        entity_type: 'order',
      });
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_contracts: 0 } });
      await dataContractApiV61.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v61/dashboard');
    });
  });

  // ===== API Lifecycle V62 =====
  describe('apiLifecycleApiV62', () => {
    it('should register API', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.registerApi({
        name: 'getOrders',
        type: 'rest',
        path: '/orders',
        method: 'GET',
        service: 'erp',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis', {
        name: 'getOrders',
        type: 'rest',
        path: '/orders',
        method: 'GET',
        service: 'erp',
      });
    });

    it('should get API', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.getApi('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/apis/a-1');
    });

    it('should list APIs with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await apiLifecycleApiV62.listApis({ stage: 'production', page: 1, pageSize: 25 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v62/apis?stage=production&page=1&pagesize=25'
      );
    });

    it('should update API', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.updateApi('a-1', { description: 'new' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v62/apis/a-1', { description: 'new' });
    });

    it('should delete API', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await apiLifecycleApiV62.deleteApi('a-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v62/apis/a-1');
    });

    it('should promote API', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.promoteApi('a-1', { target_stage: 'production' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/promote', {
        target_stage: 'production',
      });
    });

    it('should deprecate API', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.deprecateApi('a-1', { reason: 'replaced' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/deprecate', {
        reason: 'replaced',
      });
    });

    it('should retire API', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { retired: true } });
      await apiLifecycleApiV62.retireApi('a-1', { confirmation: true, reason: 'EOL' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/retire', {
        confirmation: true,
        reason: 'EOL',
      });
    });

    it('should list versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await apiLifecycleApiV62.listVersions('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/apis/a-1/versions');
    });

    it('should create version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.createVersion('a-1', { version: 'v2', changelog: 'feat' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/versions', {
        version: 'v2',
        changelog: 'feat',
      });
    });

    it('should deploy API', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.deployApi('a-1', { environment: 'prod', version: 'v2' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/deploy', {
        environment: 'prod',
        version: 'v2',
      });
    });

    it('should list consumers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await apiLifecycleApiV62.listConsumers('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/apis/a-1/consumers');
    });

    it('should register consumer', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await apiLifecycleApiV62.registerConsumer('a-1', { consumer_service: 'mobile' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v62/apis/a-1/consumers', {
        consumer_service: 'mobile',
      });
    });

    it('should unregister consumer', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { unregistered: true } });
      await apiLifecycleApiV62.unregisterConsumer('a-1', 'u-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v62/apis/a-1/consumers/u-1');
    });

    it('should list change logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await apiLifecycleApiV62.listChangeLogs({ change_type: 'breaking' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/changelog?change_type=breaking');
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_apis: 0 } });
      await apiLifecycleApiV62.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/dashboard');
    });

    it('should get deprecation candidates', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await apiLifecycleApiV62.getDeprecationCandidates(90);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v62/deprecation-candidates?days=90');
    });
  });
});
