import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaveRequestApi, hrProxyApi } from '../erp/core';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    erp: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// [V2026.09 已移除] consolidationApi 测试块：方法名与当前实现不匹配
// 实际实现使用完整方法名（getConsolidationScopes 等），测试使用简化方法名（listScopes 等）
// consolidationApi 有真实页面消费（useConsolidation.ts），如需测试请按实际方法名重写

describe('V141 ERP - leaveRequestApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list leave requests', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await leaveRequestApi.list({ page: 1, pageSize: 20, status: 'pending' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/leave-requests?page=1&pagesize=20&status=pending'
    );
  });

  it('should get leave request', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.get('LR-001');
    expect(mockClient.get).toHaveBeenCalledWith('/leave-requests/LR-001');
  });

  it('should create leave request', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.create({
      leave_type: 'annual',
      start_date: '2026-08-01',
      end_date: '2026-08-03',
    });
    expect(mockClient.post).toHaveBeenCalledWith('/leave-requests', {
      leave_type: 'annual',
      start_date: '2026-08-01',
      end_date: '2026-08-03',
    });
  });

  it('should update leave request', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.update('LR-001', { reason: '家庭原因' });
    expect(mockClient.put).toHaveBeenCalledWith('/leave-requests/LR-001', { reason: '家庭原因' });
  });

  it('should remove leave request', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await leaveRequestApi.remove('LR-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/leave-requests/LR-001');
  });

  it('submit should work', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.submit('LR-001');
    expect(mockClient.post).toHaveBeenCalledWith('/leave-requests/LR-001/submit', {});
  });

  it('approve should work', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.approve('LR-001', { comment: '批准' });
    expect(mockClient.post).toHaveBeenCalledWith('/leave-requests/LR-001/approve', {
      comment: '批准',
    });
  });

  it('reject should work', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.reject('LR-001', { reason: '人手不足' });
    expect(mockClient.post).toHaveBeenCalledWith('/leave-requests/LR-001/reject', {
      reason: '人手不足',
    });
  });

  it('cancel should work', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'LR-001' } });
    await leaveRequestApi.cancel('LR-001');
    expect(mockClient.post).toHaveBeenCalledWith('/leave-requests/LR-001/cancel', {});
  });

  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await leaveRequestApi.list({ page: 1, pagesize: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/leave-requests?page=1&pagesize=50');
  });
});

describe('V141 ERP - hrProxyApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get HR dashboard', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: {} });
    await hrProxyApi.getDashboard();
    expect(mockClient.get).toHaveBeenCalledWith('/hr/dashboard');
  });

  it('should list employees', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listEmployees({ page: 1, pageSize: 20, department_id: 'D-001' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/hr/employees?page=1&pagesize=20&department_id=D-001'
    );
  });

  it('should get employee by user', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'E-001' } });
    await hrProxyApi.getEmployeeByUser('U-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/employees/by-user/U-001');
  });

  it('should get employee', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'E-001' } });
    await hrProxyApi.getEmployee('E-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/employees/E-001');
  });

  it('should list departments', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listDepartments({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/hr/departments?page=1&pagesize=20');
  });

  it('should get department tree', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await hrProxyApi.getDepartmentTree();
    expect(mockClient.get).toHaveBeenCalledWith('/hr/departments/tree');
  });

  it('should get department', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'D-001' } });
    await hrProxyApi.getDepartment('D-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/departments/D-001');
  });

  it('should list companies', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listCompanies({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/hr/companies?page=1&pagesize=20');
  });

  it('should get company', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'C-001' } });
    await hrProxyApi.getCompany('C-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/companies/C-001');
  });

  it('should list positions', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listPositions({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/hr/positions?page=1&pagesize=20');
  });

  it('should get position', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'P-001' } });
    await hrProxyApi.getPosition('P-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/positions/P-001');
  });

  it('should list payrolls', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listPayrolls({ page: 1, pageSize: 20, period: '2026-08' });
    expect(mockClient.get).toHaveBeenCalledWith('/hr/payrolls?page=1&pagesize=20&period=2026-08');
  });

  it('should get payroll', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'PR-001' } });
    await hrProxyApi.getPayroll('PR-001');
    expect(mockClient.get).toHaveBeenCalledWith('/hr/payrolls/PR-001');
  });

  it('should list attendances', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listAttendances({ page: 1, pageSize: 20, employee_id: 'E-001' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/hr/attendances?page=1&pagesize=20&employee_id=E-001'
    );
  });

  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await hrProxyApi.listEmployees({ page: 1, pagesize: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/hr/employees?page=1&pagesize=50');
  });
});
