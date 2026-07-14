/**
 * 关键业务流程集成测试
 *
 * 测试API模块的CRUD流程完整性，验证前端API调用与后端端点的对齐
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/store', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      addNotification: vi.fn(),
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    })),
    subscribe: vi.fn(),
  },
  useAuthStore: {
    getState: vi.fn(() => ({
      user: { id: '1', name: 'Test User', role: 'admin' },
      token: 'test-token',
      permissions: [],
    })),
    subscribe: vi.fn(),
  },
}));

// Mock apiClient
vi.mock('@/api/client', () => {
  const mockClient = {
    hrm: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    crm: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    wms: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    mes: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    qms: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    erp: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

describe('API CRUD Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HRM Employee CRUD Flow', () => {
    it('should complete full CRUD lifecycle: list → get → create → update → delete', async () => {
      const { employeeApi } = await import('@/api/hrm/employee');
      const { apiClient } = await import('@/api/client');

      // 1. List
      apiClient.hrm.get.mockResolvedValue({ success: true, data: [] });
      await employeeApi.list({ page: 1, pagesize: 10 });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(expect.stringContaining('/employees'));

      // 2. Get by ID
      vi.clearAllMocks();
      apiClient.hrm.get.mockResolvedValue({ success: true, data: { id: 'emp-001' } });
      await employeeApi.get('emp-001');
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/employees/emp-001');

      // 3. Create
      vi.clearAllMocks();
      const newData = { name: '张三', email: 'zhangsan@example.com' };
      apiClient.hrm.post.mockResolvedValue({ success: true, data: { id: 'emp-001', ...newData } });
      await employeeApi.create(newData);
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/employees', newData);

      // 4. Update
      vi.clearAllMocks();
      const updateData = { name: '张三丰' };
      apiClient.hrm.put.mockResolvedValue({ success: true, data: { id: 'emp-001', name: '张三丰' } });
      await employeeApi.update('emp-001', updateData);
      expect(apiClient.hrm.put).toHaveBeenCalledWith('/employees/emp-001', updateData);

      // 5. Delete
      vi.clearAllMocks();
      apiClient.hrm.delete.mockResolvedValue({ success: true });
      await employeeApi.delete('emp-001');
      expect(apiClient.hrm.delete).toHaveBeenCalledWith('/employees/emp-001');
    });
  });

  describe('WMS Inventory CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      const { inventoryApi } = await import('@/api/wms/inventory');
      const { apiClient } = await import('@/api/client');

      // List
      apiClient.wms.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await inventoryApi.list();
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory', expect.anything());

      // Get
      vi.clearAllMocks();
      apiClient.wms.get.mockResolvedValue({ success: true, data: { id: 'inv-001' } });
      await inventoryApi.get('inv-001');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/inv-001');

      // Create
      vi.clearAllMocks();
      const data = { warehouse_id: 'wh-001', material_code: 'MAT-001', quantity: 100 };
      apiClient.wms.post.mockResolvedValue({ success: true, data: { id: 'inv-001', ...data } });
      await inventoryApi.create(data);
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inventory', data);

      // Delete
      vi.clearAllMocks();
      apiClient.wms.delete.mockResolvedValue({ success: true });
      await inventoryApi.delete('inv-001');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/inventory/inv-001');
    });
  });

  describe('CRM Customer CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      const { customerApi } = await import('@/api/crm/customer');
      const { apiClient } = await import('@/api/client');

      // List
      apiClient.crm.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await customerApi.list();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customers', expect.anything());

      // Create
      vi.clearAllMocks();
      const data = { name: '客户A', contact: '13800138000' };
      apiClient.crm.post.mockResolvedValue({ success: true, data: { id: 'cust-001', ...data } });
      await customerApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customers', data);

      // Update
      vi.clearAllMocks();
      const update = { name: '客户B' };
      apiClient.crm.put.mockResolvedValue({ success: true });
      await customerApi.update('cust-001', update);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/customers/cust-001', update);

      // Delete
      vi.clearAllMocks();
      apiClient.crm.delete.mockResolvedValue({ success: true });
      await customerApi.delete('cust-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/customers/cust-001');
    });
  });

  describe('MES Equipment CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      const { equipmentApi } = await import('@/api/mes/equipment');
      const { apiClient } = await import('@/api/client');

      // List
      apiClient.mes.get.mockResolvedValue({ success: true, data: [] });
      await equipmentApi.list();
      expect(apiClient.mes.get).toHaveBeenCalledWith(expect.stringContaining('/equipment'));

      // Get
      vi.clearAllMocks();
      apiClient.mes.get.mockResolvedValue({ success: true, data: { id: 'eq-001' } });
      await equipmentApi.get('eq-001');
      expect(apiClient.mes.get).toHaveBeenCalledWith('/equipment/eq-001');

      // Create
      vi.clearAllMocks();
      const data = { name: '设备A', code: 'EQ-001' };
      apiClient.mes.post.mockResolvedValue({ success: true, data: { id: 'eq-001', ...data } });
      await equipmentApi.create(data);
      expect(apiClient.mes.post).toHaveBeenCalledWith('/equipment', data);

      // Delete
      vi.clearAllMocks();
      apiClient.mes.delete.mockResolvedValue({ success: true });
      await equipmentApi.delete('eq-001');
      expect(apiClient.mes.delete).toHaveBeenCalledWith('/equipment/eq-001');
    });
  });

  describe('QMS Standard CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      const { standardApi } = await import('@/api/qms/standard');
      const { default: clientDefault } = await import('@/api/client');

      // List - QMS uses default import
      clientDefault.qms.get.mockResolvedValue({ success: true, data: { standards: [] } });
      await standardApi.listStandards();
      expect(clientDefault.qms.get).toHaveBeenCalled();

      // Get
      vi.clearAllMocks();
      clientDefault.qms.get.mockResolvedValue({ success: true, data: { id: 'std-001', standard_code: 'QS-001', name: '标准A', version: '1.0', status: 'active', category: 'general', description: '', created_at: '', updated_at: '', revision: 1, effective_date: '', expiry_date: '' } });
      await standardApi.getStandard('std-001');
      expect(clientDefault.qms.get).toHaveBeenCalled();

      // Create
      vi.clearAllMocks();
      const data = { name: '质量标准A', standard_code: 'QS-001', category: 'general', description: '', version: '1.0', effective_date: '', expiry_date: '' };
      clientDefault.qms.post.mockResolvedValue({ success: true, data: { id: 'std-001', standard_code: 'QS-001', name: '质量标准A', version: '1.0', status: 'active', category: 'general', description: '', created_at: '', updated_at: '', revision: 1, effective_date: '', expiry_date: '' } });
      await standardApi.createStandard(data);
      expect(clientDefault.qms.post).toHaveBeenCalled();

      // Delete
      vi.clearAllMocks();
      clientDefault.qms.delete.mockResolvedValue({ success: true });
      await standardApi.deleteStandard('std-001');
      expect(clientDefault.qms.delete).toHaveBeenCalled();
    });
  });

  describe('ERP Sales Order Mock Data Flow', () => {
    it('should return consistent data from list → get flow', async () => {
      const { salesOrderApi } = await import('@/api/erp/core/salesOrder');
      const { apiClient } = await import('@/api/client');

      const mockOrders = [
        { id: 'SO-001', order_no: 'SO-001', customer_name: '客户A', status: 'pending', total_amount: 1000 },
      ];

      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: { orders: mockOrders, total: 1, page: 0, pagesize: 10 },
      });

      const listResult = await salesOrderApi.list({ page: 0, pageSize: 10 });
      expect(listResult.success).toBe(true);
      expect(listResult.data).toBeDefined();
      expect(listResult.data.orders).toBeDefined();
      expect(Array.isArray(listResult.data.orders)).toBe(true);
      expect(listResult.data.orders.length).toBe(1);

      if (listResult.data.orders.length > 0) {
        const orderId = listResult.data.orders[0].id;
        apiClient.erp.get.mockResolvedValue({
          success: true,
          data: mockOrders[0],
        });
        const getResult = await salesOrderApi.get(orderId);
        expect(getResult.success).toBe(true);
        expect(getResult.data).toBeDefined();
      }
    });
  });
});

describe('API Module Consistency Integration', () => {
  it('should have consistent API method signatures across modules', async () => {
    const modules = [
      { name: 'hrm/employee', path: '@/api/hrm/employee', export: 'employeeApi' },
      { name: 'crm/customer', path: '@/api/crm/customer', export: 'customerApi' },
      { name: 'wms/inventory', path: '@/api/wms/inventory', export: 'inventoryApi' },
      { name: 'mes/equipment', path: '@/api/mes/equipment', export: 'equipmentApi' },
    ];

    for (const mod of modules) {
      const module = await import(mod.path);
      const api = module[mod.export];
      expect(api).toBeDefined();
      expect(typeof api.list).toBe('function');
      expect(typeof api.get).toBe('function');
      expect(typeof api.create).toBe('function');
      expect(typeof api.update).toBe('function');
      expect(typeof api.delete).toBe('function');
    }
  });

  it('should have all core API modules importable', async () => {
    const coreModules = [
      '@/api/hrm',
      '@/api/crm',
      '@/api/wms',
      '@/api/mes',
      '@/api/qms',
      '@/api/erp',
      '@/api/finance',
      '@/api/workflow',
      '@/api/pdm',
      '@/api/ehs',
      '@/api/lims',
      '@/api/scm',
    ];

    for (const path of coreModules) {
      const mod = await import(path);
      expect(mod).toBeDefined();
    }
  });
});
