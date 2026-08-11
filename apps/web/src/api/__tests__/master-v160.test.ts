import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataFederationMeshApiV75 } from '../master/dataFederationMeshV75';
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

describe('V160 masterData Data Federation & Mesh API bindings', () => {
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

  // ===== 数据域管理 =====
  describe('Data Domain Management', () => {
    it('should create domain', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.createDomain({
        name: 'Customer Domain',
        description: 'Customer data domain',
        domain_type: 'source',
        owner_id: 'user-1',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/domains', {
        name: 'Customer Domain',
        description: 'Customer data domain',
        domain_type: 'source',
        owner_id: 'user-1',
      });
    });

    it('should get domain by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getDomain('domain-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/domains/domain-1');
    });

    it('should list domains with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listDomains({
        domainType: 'source',
        status: 'active',
        page: 1,
        pageSize: 10,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v75/domains?domain_type=source&status=active&page=1&page_size=10'
      );
    });

    it('should list domains without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listDomains();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/domains');
    });

    it('should update domain', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.updateDomain('domain-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v75/domains/domain-1', { description: 'Updated' });
    });

    it('should remove domain', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataFederationMeshApiV75.removeDomain('domain-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v75/domains/domain-1');
    });

    it('should list domain products', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataFederationMeshApiV75.listDomainProducts('domain-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/domains/domain-1/products');
    });

    it('should list domain consumers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataFederationMeshApiV75.listDomainConsumers('domain-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/domains/domain-1/consumers');
    });
  });

  // ===== 联邦数据产品 =====
  describe('Federated Data Products', () => {
    it('should register product', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.registerProduct({
        name: 'Customer 360 View',
        description: 'Customer comprehensive view',
        domain_id: 'domain-1',
        product_type: 'dataset',
        format: 'table',
        data_classification: 'confidential',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/products', {
        name: 'Customer 360 View',
        description: 'Customer comprehensive view',
        domain_id: 'domain-1',
        product_type: 'dataset',
        format: 'table',
        data_classification: 'confidential',
      });
    });

    it('should get product by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getProduct('product-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products/product-1');
    });

    it('should list products with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listProducts({
        domainId: 'domain-1',
        productType: 'dataset',
        status: 'active',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v75/products?domain_id=domain-1&product_type=dataset&status=active&page=1&page_size=20'
      );
    });

    it('should list products without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listProducts();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products');
    });

    it('should update product', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.updateProduct('product-1', { description: 'Updated' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v75/products/product-1', { description: 'Updated' });
    });

    it('should remove product', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataFederationMeshApiV75.removeProduct('product-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v75/products/product-1');
    });

    it('should get product consumers', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataFederationMeshApiV75.getProductConsumers('product-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products/product-1/consumers');
    });

    it('should get product quality', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getProductQuality('product-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products/product-1/quality');
    });
  });

  // ===== 数据共享协议 =====
  describe('Sharing Agreements', () => {
    it('should create agreement', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.createAgreement({
        provider_domain_id: 'domain-1',
        consumer_domain_id: 'domain-2',
        data_product_id: 'product-1',
        access_type: 'read',
        terms: 'Standard sharing terms',
        data_classification: 'confidential',
        effective_from: '2026-08-01',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/agreements', {
        provider_domain_id: 'domain-1',
        consumer_domain_id: 'domain-2',
        data_product_id: 'product-1',
        access_type: 'read',
        terms: 'Standard sharing terms',
        data_classification: 'confidential',
        effective_from: '2026-08-01',
      });
    });

    it('should get agreement by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getAgreement('agree-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/agreements/agree-1');
    });

    it('should list agreements', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listAgreements({
        providerDomainId: 'domain-1',
        status: 'active',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/agreements?provider_domain_id=domain-1&status=active');
    });

    it('should approve agreement', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.approveAgreement('agree-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/agreements/agree-1/approve', {});
    });

    it('should reject agreement', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.rejectAgreement('agree-1', 'Not acceptable');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/agreements/agree-1/reject', {
        reason: 'Not acceptable',
      });
    });

    it('should terminate agreement', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.terminateAgreement('agree-1', 'Ended by provider');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/agreements/agree-1/terminate', {
        reason: 'Ended by provider',
      });
    });
  });

  // ===== 跨域数据访问 =====
  describe('Cross-Domain Access', () => {
    it('should request access', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.requestAccess('agree-1', {
        purpose: 'Analytics project',
        access_type: 'read',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        '/mdm-v75/agreements/agree-1/access-requests',
        {
          purpose: 'Analytics project',
          access_type: 'read',
        }
      );
    });

    it('should list access requests', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listAccessRequests({
        status: 'pending',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/access-requests?status=pending');
    });

    it('should approve access request', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.approveAccessRequest('req-1', 'user-1', '2026-12-31');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/access-requests/req-1/approve', {
        grant_by: 'user-1',
        expires_at: '2026-12-31',
      });
    });

    it('should reject access request', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.rejectAccessRequest('req-1', 'Insufficient approval');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/access-requests/req-1/reject', {
        reason: 'Insufficient approval',
      });
    });

    it('should revoke access request', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.revokeAccessRequest('req-1', 'Policy changed');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/access-requests/req-1/revoke', {
        reason: 'Policy changed',
      });
    });

    it('should list access audit', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listAccessAudit({ domainId: 'domain-1', action: 'read' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/access-audit?domain_id=domain-1&action=read');
    });
  });

  // ===== 联邦配置 =====
  describe('Federation Configuration', () => {
    it('should register node', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.registerNode({
        name: 'Analytics Node',
        endpoint: 'https://analytics.example.com/grpc',
        protocol: 'grpc',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/nodes', {
        name: 'Analytics Node',
        endpoint: 'https://analytics.example.com/grpc',
        protocol: 'grpc',
      });
    });

    it('should get node by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getNode('node-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/nodes/node-1');
    });

    it('should list nodes with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listNodes({ status: 'connected' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/nodes?status=connected');
    });

    it('should list nodes without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataFederationMeshApiV75.listNodes();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/nodes');
    });

    it('should update node', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.updateNode('node-1', { name: 'Updated Node' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v75/nodes/node-1', { name: 'Updated Node' });
    });

    it('should remove node', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataFederationMeshApiV75.removeNode('node-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v75/nodes/node-1');
    });

    it('should health check node', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { node_id: 'node-1', status: 'connected' } });
      await dataFederationMeshApiV75.healthCheckNode('node-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v75/nodes/node-1/health', {});
    });
  });

  // ===== 跨域血缘追踪 =====
  describe('Cross-Domain Lineage', () => {
    it('should get cross-domain lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getCrossDomainLineage('product-1', {
        direction: 'downstream',
        depth: 3,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v75/products/product-1/lineage?direction=downstream&depth=3'
      );
    });

    it('should get cross-domain lineage without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getCrossDomainLineage('product-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products/product-1/lineage');
    });

    it('should get cross-domain impact', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getCrossDomainImpact('product-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/products/product-1/impact');
    });
  });

  // ===== 联邦治理仪表板 =====
  describe('Federation Governance Dashboard', () => {
    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/dashboard');
    });

    it('should get domain stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getDomainStats('domain-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/domains/domain-1/stats');
    });

    it('should get federation health', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataFederationMeshApiV75.getFederationHealth();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v75/health');
    });
  });
});
