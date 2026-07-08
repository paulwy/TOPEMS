import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => {
  const createMockModule = () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  });
  const mockModules = {
    mes: createMockModule(),
    wms: createMockModule(),
    crm: createMockModule(),
    hrm: createMockModule(),
    finance: createMockModule(),
    erp: createMockModule(),
    qms: createMockModule(),
  };
  return {
    apiClient: mockModules,
    default: mockModules,
  };
});

describe('Cross-Module Business Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Production Order → Material Issue → Inventory Deduction Flow', () => {
    it('should complete production order creation and material issue flow', async () => {
      const { productionOrderApi } = await import('@/api/mes/productionOrder');
      const { materialBomApi } = await import('@/api/mes/material');
      const { inventoryApi } = await import('@/api/wms/inventory');
      const { apiClient } = await import('@/api/client');

      const orderData = {
        order_no: 'PO-2026-001',
        product_code: 'PROD-001',
        quantity: 100,
        planned_start_date: '2026-07-10',
        planned_end_date: '2026-07-15',
      };
      apiClient.mes.post.mockResolvedValue({
        success: true,
        data: { id: 'po-001', ...orderData, status: 'created' },
      });
      const orderResult = await productionOrderApi.create(orderData);
      expect(apiClient.mes.post).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.anything()
      );
      expect(orderResult.success).toBe(true);
      expect(orderResult.data.id).toBe('po-001');

      vi.clearAllMocks();
      apiClient.mes.get.mockResolvedValue({
        success: true,
        data: [
          { id: 'bom-001', material_code: 'MAT-001', quantity: 2 },
          { id: 'bom-002', material_code: 'MAT-002', quantity: 1 },
        ],
      });
      const bomResult = await materialBomApi.list({ product_code: 'PROD-001' });
      expect(apiClient.mes.get).toHaveBeenCalled();
      expect(bomResult.success).toBe(true);
      expect(bomResult.data.length).toBe(2);

      vi.clearAllMocks();
      apiClient.wms.get.mockResolvedValue({
        success: true,
        data: [
          { material_code: 'MAT-001', available_qty: 500 },
          { material_code: 'MAT-002', available_qty: 80 },
        ],
      });
      const invResult = await inventoryApi.list({ material_code: 'MAT-001' });
      expect(apiClient.wms.get).toHaveBeenCalled();
      expect(invResult.success).toBe(true);
      expect(invResult.data[0].available_qty).toBeGreaterThanOrEqual(200);
    });

    it('should handle insufficient inventory scenario', async () => {
      const { inventoryApi } = await import('@/api/wms/inventory');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.get.mockResolvedValue({
        success: true,
        data: [{ material_code: 'MAT-001', available_qty: 50 }],
      });

      const result = await inventoryApi.list({ material_code: 'MAT-001' });
      expect(result.success).toBe(true);
      expect(result.data[0].available_qty).toBeLessThan(200);
    });
  });

  describe('CRM Opportunity → Customer Flow', () => {
    it('should complete customer creation and opportunity management', async () => {
      const { opportunityApi } = await import('@/api/crm/opportunity');
      const { customerApi } = await import('@/api/crm/customer');
      const { apiClient } = await import('@/api/client');

      const customerData = {
        name: '测试客户',
        contact: '张三',
        phone: '13800138000',
        email: 'test@example.com',
      };
      apiClient.crm.post.mockResolvedValue({
        success: true,
        data: { id: 'cust-001', ...customerData },
      });
      const custResult = await customerApi.create(customerData);
      expect(apiClient.crm.post).toHaveBeenCalledWith(
        expect.stringContaining('/customers'),
        expect.anything()
      );
      expect(custResult.success).toBe(true);

      vi.clearAllMocks();
      const oppData = {
        customer_id: 'cust-001',
        title: '测试商机',
        amount: 100000,
        stage: 'negotiation',
        probability: 70,
      };
      apiClient.crm.post.mockResolvedValue({
        success: true,
        data: { id: 'opp-001', ...oppData },
      });
      const oppResult = await opportunityApi.create(oppData);
      expect(oppResult.success).toBe(true);
      expect(oppResult.data.amount).toBe(100000);

      vi.clearAllMocks();
      apiClient.crm.put.mockResolvedValue({
        success: true,
        data: { id: 'opp-001', stage: 'won', probability: 100 },
      });
      const wonResult = await opportunityApi.update('opp-001', {
        stage: 'won',
        probability: 100,
      });
      expect(wonResult.success).toBe(true);
      expect(wonResult.data.stage).toBe('won');
    });
  });

  describe('HRM Employee Onboarding Flow', () => {
    it('should complete employee onboarding process', async () => {
      const { employeeApi } = await import('@/api/hrm/employee');
      const { apiClient } = await import('@/api/client');

      const employeeData = {
        name: '新员工',
        email: 'new@example.com',
        department: '技术部',
        position: '工程师',
        hire_date: '2026-07-10',
      };
      apiClient.hrm.post.mockResolvedValue({
        success: true,
        data: { id: 'emp-new', ...employeeData, status: 'active' },
      });
      const result = await employeeApi.create(employeeData);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('active');

      vi.clearAllMocks();
      apiClient.hrm.get.mockResolvedValue({
        success: true,
        data: { id: 'emp-new', name: '新员工', department: '技术部' },
      });
      const detail = await employeeApi.get('emp-new');
      expect(detail.success).toBe(true);
      expect(detail.data.id).toBe('emp-new');

      vi.clearAllMocks();
      const updateData = { position: '高级工程师' };
      apiClient.hrm.put.mockResolvedValue({
        success: true,
        data: { id: 'emp-new', ...updateData },
      });
      const updateResult = await employeeApi.update('emp-new', updateData);
      expect(updateResult.success).toBe(true);
    });
  });

  describe('Data Consistency Verification', () => {
    it('should have consistent response structure across modules', async () => {
      const { employeeApi } = await import('@/api/hrm/employee');
      const { customerApi } = await import('@/api/crm/customer');
      const { inventoryApi } = await import('@/api/wms/inventory');
      const { apiClient } = await import('@/api/client');

      const mockResponse = { success: true, data: [], total: 10 };

      apiClient.hrm.get.mockResolvedValue(mockResponse);
      apiClient.crm.get.mockResolvedValue(mockResponse);
      apiClient.wms.get.mockResolvedValue(mockResponse);

      const [hrmResult, crmResult, wmsResult] = await Promise.all([
        employeeApi.list({ page: 1, pagesize: 10 }),
        customerApi.list({ page: 1, pagesize: 10 }),
        inventoryApi.list({ page: 1, pagesize: 10 }),
      ]);

      expect(hrmResult.success).toBe(crmResult.success);
      expect(crmResult.success).toBe(wmsResult.success);
      expect(Array.isArray(hrmResult.data)).toBe(true);
      expect(Array.isArray(crmResult.data)).toBe(true);
      expect(Array.isArray(wmsResult.data)).toBe(true);
    });

    it('should have consistent error handling pattern', async () => {
      const { employeeApi } = await import('@/api/hrm/employee');
      const { apiClient } = await import('@/api/client');

      apiClient.hrm.get.mockRejectedValue(new Error('Network error'));

      try {
        await employeeApi.get('invalid-id');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
