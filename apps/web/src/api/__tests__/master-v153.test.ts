import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatewayApiV54 } from '../master/gatewayV54';
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

describe('V153 masterData Gateway API bindings', () => {
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

  // ===== API 路由管理 =====
  describe('Route Management', () => {
    it('should create route', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.createRoute({ path: '/api/v1/users', upstream: 'http://localhost:3000' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/routes', {
        path: '/api/v1/users',
        upstream: 'http://localhost:3000',
      });
    });

    it('should get route by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getRoute('route-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/routes/route-1');
    });

    it('should list routes', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await gatewayApiV54.listRoutes({ status: 'active', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/routes?status=active&page=1&page_size=20'
      );
    });

    it('should list routes without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await gatewayApiV54.listRoutes();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/routes');
    });

    it('should update route', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.updateRoute('route-1', { upstream: 'http://localhost:4000' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v54/routes/route-1', {
        upstream: 'http://localhost:4000',
      });
    });

    it('should delete route', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await gatewayApiV54.deleteRoute('route-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v54/routes/route-1');
    });

    it('should enable route', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.enableRoute('route-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v54/routes/route-1/enable', {});
    });

    it('should disable route', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.disableRoute('route-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v54/routes/route-1/disable', {});
    });
  });

  // ===== 限流规则管理 =====
  describe('Rate Limit Management', () => {
    it('should create rate limit rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.createRateLimitRule({
        route_id: 'route-1',
        limit_type: 'fixed_window',
        limit_value: 1000,
        window_seconds: 60,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/rate-limits', {
        route_id: 'route-1',
        limit_type: 'fixed_window',
        limit_value: 1000,
        window_seconds: 60,
      });
    });

    it('should get rate limit rule by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getRateLimitRule('rl-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/rate-limits/rl-1');
    });

    it('should list rate limit rules', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await gatewayApiV54.listRateLimitRules('route-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/rate-limits?route_id=route-1');
    });

    it('should list rate limit rules without filter', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await gatewayApiV54.listRateLimitRules();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/rate-limits');
    });

    it('should update rate limit rule', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.updateRateLimitRule('rl-1', { limit_value: 500 });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v54/rate-limits/rl-1', {
        limit_value: 500,
      });
    });

    it('should delete rate limit rule', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await gatewayApiV54.deleteRateLimitRule('rl-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v54/rate-limits/rl-1');
    });
  });

  // ===== 认证配置管理 =====
  describe('Auth Config Management', () => {
    it('should create auth config', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.createAuthConfig({
        route_id: 'route-1',
        auth_type: 'api_key',
        config: { header: 'X-API-Key' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/auth-configs', {
        route_id: 'route-1',
        auth_type: 'api_key',
        config: { header: 'X-API-Key' },
      });
    });

    it('should get auth config by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getAuthConfig('auth-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/auth-configs/auth-1');
    });

    it('should list auth configs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await gatewayApiV54.listAuthConfigs('route-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/auth-configs?route_id=route-1');
    });

    it('should update auth config', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.updateAuthConfig('auth-1', {
        config: { audience: 'https://api.example.com' },
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v54/auth-configs/auth-1', {
        config: { audience: 'https://api.example.com' },
      });
    });

    it('should delete auth config', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await gatewayApiV54.deleteAuthConfig('auth-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v54/auth-configs/auth-1');
    });
  });

  // ===== API 日志查询 =====
  describe('API Logs', () => {
    it('should list logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await gatewayApiV54.listLogs({ route_id: 'route-1', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/logs?route_id=route-1&page=1&page_size=20'
      );
    });

    it('should get log by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getLog('log-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/logs/log-1');
    });
  });

  // ===== 开发者管理 =====
  describe('Developer Management', () => {
    it('should create developer', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.createDeveloper({
        tenant_id: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/developers', {
        tenant_id: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should get developer by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getDeveloper('dev-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/developers/dev-1');
    });

    it('should list developers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await gatewayApiV54.listDevelopers({ tenant_id: 'tenant-1', status: 'active' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/developers?tenant_id=tenant-1&status=active'
      );
    });

    it('should update developer', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.updateDeveloper('dev-1', { company: 'ACME Corp' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v54/developers/dev-1', {
        company: 'ACME Corp',
      });
    });

    it('should delete developer', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await gatewayApiV54.deleteDeveloper('dev-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v54/developers/dev-1');
    });

    it('should activate developer', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.activateDeveloper('dev-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v54/developers/dev-1/activate', {});
    });

    it('should disable developer', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.disableDeveloper('dev-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v54/developers/dev-1/disable', {});
    });
  });

  // ===== API Key 管理 =====
  describe('API Key Management', () => {
    it('should create API key', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.createAPIKey({ developer_id: 'dev-1', name: 'Production Key' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/api-keys', {
        developer_id: 'dev-1',
        name: 'Production Key',
      });
    });

    it('should list API keys', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await gatewayApiV54.listAPIKeys('dev-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/api-keys?developer_id=dev-1');
    });

    it('should revoke API key', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.revokeAPIKey('key-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v54/api-keys/key-1/revoke', {});
    });

    it('should rotate API key', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.rotateAPIKey('key-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v54/api-keys/key-1/rotate', {});
    });

    it('should delete API key', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await gatewayApiV54.deleteAPIKey('key-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v54/api-keys/key-1');
    });
  });

  // ===== 使用统计 & 仪表盘 =====
  describe('Usage Statistics & Dashboard', () => {
    it('should get usage stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getUsageStats('dev-1', { start_time: '2026-08-01' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v54/developers/dev-1/usage?start_time=2026-08-01'
      );
    });

    it('should get gateway dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await gatewayApiV54.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v54/dashboard');
    });
  });
});
