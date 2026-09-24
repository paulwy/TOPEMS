import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAdapter } from '../ExternalErpAdapters';
import type { CreateVoucherRequest } from '../../types/finance';

// ─── Mock axios ───
const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
    })),
  },
}));

// ─── Mock i18n ───
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

// ─── Helpers ───
const baseConfig = {
  type: 'kingdee_k3' as const,
  name: 'Test Kingdee',
  endpoint: 'http://localhost:8080',
  username: 'admin',
  password: 'secret',
};

const sampleVoucher: CreateVoucherRequest = {
  voucher_date: '2024-01-15',
  period: '2024-01',
  summary: 'Test voucher',
  entries: [
    {
      account_id: '1001',
      debit_amount: 1000,
      credit_amount: 0,
      summary: 'Debit entry',
      department_id: 'DEPT01',
      project_id: 'PROJ01',
      customer_id: 'CUST01',
      supplier_id: 'SUP01',
      employee_id: 'EMP01',
    },
    {
      account_id: '2001',
      debit_amount: 0,
      credit_amount: 1000,
      summary: 'Credit entry',
      department_id: 'DEPT02',
      project_id: 'PROJ02',
      customer_id: 'CUST02',
      supplier_id: 'SUP02',
      employee_id: 'EMP02',
    },
  ],
} as CreateVoucherRequest;

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// Factory: createAdapter
// ============================================
describe('createAdapter factory', () => {
  it('should create a KingdeeAdapter for kingdee_k3', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'kingdee_k3' });
    expect(adapter).toBeDefined();
    expect(typeof adapter.testConnection).toBe('function');
    expect(typeof adapter.authenticate).toBe('function');
  });

  it('should create a KingdeeAdapter for kingdee_cloud', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'kingdee_cloud' });
    expect(adapter).toBeDefined();
  });

  it('should create a KingdeeAdapter for kingdee_eas', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'kingdee_eas' });
    expect(adapter).toBeDefined();
  });

  it('should create a YonyouAdapter for yonyou_u8', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    expect(adapter).toBeDefined();
  });

  it('should create a YonyouAdapter for yonyou_nc', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_nc' });
    expect(adapter).toBeDefined();
  });

  it('should create a SapAdapter for sap_s4', () => {
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    expect(adapter).toBeDefined();
  });

  it('should throw for unknown ERP type', () => {
    expect(() => createAdapter({ ...baseConfig, type: '浪潮GS' as never })).toThrow();
  });
});

// ============================================
// KingdeeAdapter
// ============================================
describe('KingdeeAdapter', () => {
  it('testConnection should return true when auth succeeds', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token-123' } });
    const adapter = createAdapter(baseConfig);
    const result = await adapter.testConnection();
    expect(result).toBe(true);
  });

  it('testConnection should return false when auth fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Auth failed'));
    const adapter = createAdapter(baseConfig);
    const result = await adapter.testConnection();
    expect(result).toBe(false);
  });

  it('authenticate should return and cache token', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token-abc' } });
    const adapter = createAdapter(baseConfig);
    const token = await adapter.authenticate();
    expect(token).toBe('kd-token-abc');

    // Second call should use cached token (no new HTTP call)
    const token2 = await adapter.authenticate();
    expect(token2).toBe('kd-token-abc');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('getAccounts should call correct endpoint and return mapped data', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token' } });
    mockGet.mockResolvedValueOnce({
      data: { List: [{ id: '1' }, { id: '2' }], TotalCount: 2 },
    });
    const adapter = createAdapter(baseConfig);
    const result = await adapter.getAccounts({ page: 2, pageSize: 50 });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/bd/account',
      expect.objectContaining({
        headers: { Authorization: 'Bearer kd-token' },
        params: { page: 2, page_size: 50 },
      })
    );
  });

  it('getCustomers should call correct endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token' } });
    mockGet.mockResolvedValueOnce({
      data: { List: [{ name: 'C1' }], TotalCount: 1 },
    });
    const adapter = createAdapter(baseConfig);
    const result = await adapter.getCustomers();
    expect(result.total).toBe(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/crm/customers', expect.any(Object));
  });

  it('getSuppliers should call correct endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token' } });
    mockGet.mockResolvedValueOnce({
      data: { List: [], TotalCount: 0 },
    });
    const adapter = createAdapter(baseConfig);
    const result = await adapter.getSuppliers();
    expect(result.total).toBe(0);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/ap/suppliers', expect.any(Object));
  });

  it('getVouchers should pass date params correctly', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token' } });
    mockGet.mockResolvedValueOnce({
      data: { List: [{ id: 'v1' }], TotalCount: 1 },
    });
    const adapter = createAdapter(baseConfig);
    await adapter.getVouchers({ start_date: '2024-01-01', end_date: '2024-01-31' });
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/gl/vouchers',
      expect.objectContaining({
        params: expect.objectContaining({
          date_begin: '2024-01-01',
          date_end: '2024-01-31',
        }),
      })
    );
  });

  it('createVoucher should POST and return voucher ID', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'kd-token' } });
    mockPost.mockResolvedValueOnce({ data: { FVoucherId: 'VCH-1001' } });
    const adapter = createAdapter(baseConfig);
    const id = await adapter.createVoucher(sampleVoucher);
    expect(id).toBe('VCH-1001');
  });

  it('batchCreateVouchers should batch by 10 and report success', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'kd-token' } });
    mockPost.mockResolvedValue({ data: {} });
    const adapter = createAdapter(baseConfig);
    const vouchers = Array.from({ length: 15 }, () => sampleVoucher);
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(15);
    expect(result.created).toBe(15);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('batchCreateVouchers should report failed batches', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'kd-token' } });
    mockPost.mockRejectedValue(new Error('Server error'));
    const adapter = createAdapter(baseConfig);
    const vouchers = Array.from({ length: 5 }, () => sampleVoucher);
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(5);
    expect(result.created).toBe(0);
    expect(result.failed).toBe(5);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});

// ============================================
// YonyouAdapter
// ============================================
describe('YonyouAdapter', () => {
  it('testConnection should return true when auth succeeds', async () => {
    mockPost.mockResolvedValueOnce({ data: { session_id: 'yy-session' } });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const result = await adapter.testConnection();
    expect(result).toBe(true);
  });

  it('testConnection should return false on auth failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Login failed'));
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const result = await adapter.testConnection();
    expect(result).toBe(false);
  });

  it('authenticate should return and cache session', async () => {
    mockPost.mockResolvedValueOnce({ data: { session_id: 'yy-session-abc' } });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const session = await adapter.authenticate();
    expect(session).toBe('yy-session-abc');
    const session2 = await adapter.authenticate();
    expect(session2).toBe('yy-session-abc');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('getAccounts should POST to U8 endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { session_id: 'yy-session' } });
    mockPost.mockResolvedValueOnce({
      data: { account_list: [{ code: '1001' }], total_count: 1 },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const result = await adapter.getAccounts({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/u8api/account/query',
      expect.objectContaining({ page: 1, page_size: 20 }),
      expect.any(Object)
    );
  });

  it('getCustomers should POST to customer endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { session_id: 'yy-session' } });
    mockPost.mockResolvedValueOnce({
      data: { customer_list: [{ name: 'C1' }], total_count: 1 },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const result = await adapter.getCustomers();
    expect(result.total).toBe(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/u8api/customer/query',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('createVoucher should POST to voucher/add endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { session_id: 'yy-session' } });
    mockPost.mockResolvedValueOnce({ data: { voucher_id: 'YY-VCH-001' } });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const id = await adapter.createVoucher(sampleVoucher);
    expect(id).toBe('YY-VCH-001');
  });

  it('batchCreateVouchers should process one by one', async () => {
    mockPost.mockResolvedValue({ data: { session_id: 'yy-session' } });
    mockPost.mockResolvedValue({ data: { voucher_id: 'v' } });
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const vouchers = [sampleVoucher, sampleVoucher];
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(2);
    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('batchCreateVouchers should track individual failures', async () => {
    mockPost.mockResolvedValue({ data: { session_id: 'yy-session' } });
    // First voucher succeeds, second fails
    mockPost
      .mockResolvedValueOnce({ data: { voucher_id: 'v1' } })
      .mockRejectedValueOnce(new Error('Duplicate voucher'));
    const adapter = createAdapter({ ...baseConfig, type: 'yonyou_u8' });
    const vouchers = [sampleVoucher, sampleVoucher];
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(2);
    expect(result.created).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});

// ============================================
// SapAdapter
// ============================================
describe('SapAdapter', () => {
  it('testConnection should return true when auth succeeds', async () => {
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const result = await adapter.testConnection();
    expect(result).toBe(true);
  });

  it('authenticate should return Basic auth token', async () => {
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const token = await adapter.authenticate();
    expect(token).toMatch(/^Basic /);
  });

  it('authenticate should cache the token', async () => {
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const token1 = await adapter.authenticate();
    const token2 = await adapter.authenticate();
    expect(token1).toBe(token2);
  });

  it('getAccounts should call OData endpoint with $skip and $top', async () => {
    mockGet.mockResolvedValueOnce({
      data: { d: { results: [{ GLAccount: '0001' }], __count: 1 } },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const result = await adapter.getAccounts({ page: 2, pageSize: 50 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith(
      '/sap/opu/odata/sap/API_GLACCOUNTHierarchy',
      expect.objectContaining({
        params: expect.objectContaining({ $skip: 50, $top: 50 }),
      })
    );
  });

  it('getCustomers should use Customer filter', async () => {
    mockGet.mockResolvedValueOnce({
      data: { d: { results: [], __count: 0 } },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    await adapter.getCustomers();
    expect(mockGet).toHaveBeenCalledWith(
      '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
      expect.objectContaining({
        params: expect.objectContaining({ $filter: 'Customer' }),
      })
    );
  });

  it('getSuppliers should use Supplier filter', async () => {
    mockGet.mockResolvedValueOnce({
      data: { d: { results: [], __count: 0 } },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    await adapter.getSuppliers();
    expect(mockGet).toHaveBeenCalledWith(
      '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
      expect.objectContaining({
        params: expect.objectContaining({ $filter: 'Supplier' }),
      })
    );
  });

  it('createVoucher should throw when RETURN contains error type E', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        RETURN: [{ TYPE: 'E', MESSAGE: 'Posting failed' }],
        AC_DOC_NO: '',
      },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    await expect(adapter.createVoucher(sampleVoucher)).rejects.toThrow('Posting failed');
  });

  it('createVoucher should return AC_DOC_NO on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        RETURN: [{ TYPE: 'S', MESSAGE: 'Success' }],
        AC_DOC_NO: 'SAP-50012345',
      },
    });
    mockPost.mockResolvedValueOnce({ data: {} }); // commit call
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const docNo = await adapter.createVoucher(sampleVoucher);
    expect(docNo).toBe('SAP-50012345');
  });

  it('batchCreateVouchers should process one by one', async () => {
    mockPost.mockResolvedValue({
      data: { RETURN: [{ TYPE: 'S', MESSAGE: 'OK' }], AC_DOC_NO: 'DOC' },
    });
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const vouchers = [sampleVoucher, sampleVoucher];
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(2);
    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('batchCreateVouchers should track failures', async () => {
    mockPost
      .mockResolvedValueOnce({
        data: { RETURN: [{ TYPE: 'S', MESSAGE: 'OK' }], AC_DOC_NO: 'DOC1' },
      })
      .mockRejectedValueOnce(new Error('BAPI error'));
    const adapter = createAdapter({ ...baseConfig, type: 'sap_s4' });
    const vouchers = [sampleVoucher, sampleVoucher];
    const result = await adapter.batchCreateVouchers(vouchers);
    expect(result.total).toBe(2);
    expect(result.created).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.success).toBe(false);
  });
});
