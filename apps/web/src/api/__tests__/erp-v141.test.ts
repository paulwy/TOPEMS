import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consolidationApi, leaveRequestApi, hrProxyApi } from '../erp/core';
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

describe('V141 ERP - consolidationApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Scopes =====
  it('should list consolidation scopes', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listScopes({ page: 1, pageSize: 20, period: '2026-08' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/scopes?page=1&pagesize=20&period=2026-08'
    );
  });

  it('should create consolidation scope', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'S-001' } });
    await consolidationApi.createScope({ name: '合并范围A', period: '2026-08' });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/scopes', {
      name: '合并范围A',
      period: '2026-08',
    });
  });

  it('should get consolidation scope', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'S-001' } });
    await consolidationApi.getScope('S-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/scopes/S-001');
  });

  it('should update consolidation scope', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'S-001' } });
    await consolidationApi.updateScope('S-001', { name: '新名称' });
    expect(mockClient.put).toHaveBeenCalledWith('/consolidation/scopes/S-001', { name: '新名称' });
  });

  it('should remove consolidation scope', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await consolidationApi.removeScope('S-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/consolidation/scopes/S-001');
  });

  it('deleteScope should alias removeScope', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await consolidationApi.deleteScope('S-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/consolidation/scopes/S-001');
  });

  // ===== Scope Companies =====
  it('should list scope companies', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listScopeCompanies('S-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/scopes/S-001/companies');
  });

  it('should add scope company', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'SC-001' } });
    await consolidationApi.addScopeCompany({
      scope_id: 'S-001',
      company_id: 'C-001',
      ownership_percentage: 80,
    });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/scopes/companies', {
      scope_id: 'S-001',
      company_id: 'C-001',
      ownership_percentage: 80,
    });
  });

  it('should update scope company', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'SC-001' } });
    await consolidationApi.updateScopeCompany('SC-001', { ownership_percentage: 90 });
    expect(mockClient.put).toHaveBeenCalledWith('/consolidation/scopes/companies/SC-001', {
      ownership_percentage: 90,
    });
  });

  it('should remove scope company', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await consolidationApi.removeScopeCompany('SC-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/consolidation/scopes/companies/SC-001');
  });

  // ===== Elimination Rules =====
  it('should list elimination rules', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listEliminationRules({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/elimination-rules?page=1&pagesize=20'
    );
  });

  it('should create elimination rule', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'R-001' } });
    await consolidationApi.createEliminationRule({ name: '抵销规则1', rule_type: 'intercompany' });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/elimination-rules', {
      name: '抵销规则1',
      rule_type: 'intercompany',
    });
  });

  it('should get elimination rule', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'R-001' } });
    await consolidationApi.getEliminationRule('R-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/elimination-rules/R-001');
  });

  it('should update elimination rule', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'R-001' } });
    await consolidationApi.updateEliminationRule('R-001', { name: '新规则' });
    expect(mockClient.put).toHaveBeenCalledWith('/consolidation/elimination-rules/R-001', {
      name: '新规则',
    });
  });

  it('should remove elimination rule', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await consolidationApi.removeEliminationRule('R-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/consolidation/elimination-rules/R-001');
  });

  it('should export elimination worksheet', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: new Blob() });
    await consolidationApi.exportEliminationWorksheet('S-001');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/scopes/S-001/elimination-worksheet/export'
    );
  });

  // ===== Internal Transactions =====
  it('should list internal transactions', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listInternalTransactions({ page: 1, pageSize: 20, period: '2026-08' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/internal-transactions?page=1&pagesize=20&period=2026-08'
    );
  });

  it('should get internal transaction', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'T-001' } });
    await consolidationApi.getInternalTransaction('T-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/internal-transactions/T-001');
  });

  it('should execute elimination', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { success: true, message: '完成' } });
    await consolidationApi.executeElimination({ scope_id: 'S-001', period: '2026-08' });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/execute-elimination', {
      scope_id: 'S-001',
      period: '2026-08',
    });
  });

  // ===== Reports =====
  it('should list reports', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listReports({ page: 1, pageSize: 20, scope_id: 'S-001' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/reports?page=1&pagesize=20&scope_id=S-001'
    );
  });

  it('should generate report', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'RPT-001' } });
    await consolidationApi.generateReport({ scope_id: 'S-001', period: '2026-08' });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/reports/generate', {
      scope_id: 'S-001',
      period: '2026-08',
    });
  });

  it('should get report', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'RPT-001' } });
    await consolidationApi.getReport('RPT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/reports/RPT-001');
  });

  it('should remove report', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await consolidationApi.removeReport('RPT-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/consolidation/reports/RPT-001');
  });

  it('should get report lines', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.getReportLines('RPT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/reports/RPT-001/lines');
  });

  it('should export report', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: new Blob() });
    await consolidationApi.exportReport('RPT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/reports/RPT-001/export');
  });

  it('should approve report', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'RPT-001' } });
    await consolidationApi.approveReport('RPT-001', { comment: '审批通过' });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/reports/RPT-001/approve', {
      comment: '审批通过',
    });
  });

  it('should submit report', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'RPT-001' } });
    await consolidationApi.submitReport('RPT-001');
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/reports/RPT-001/submit', {});
  });

  it('should publish report', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'RPT-001' } });
    await consolidationApi.publishReport('RPT-001');
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/reports/RPT-001/publish', {});
  });

  // ===== Company Relations =====
  it('should list company relations', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listCompanyRelations({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/consolidation/company-relations?page=1&pagesize=20'
    );
  });

  it('should create company relation', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'CR-001' } });
    await consolidationApi.createCompanyRelation({
      parent_company_id: 'C-001',
      child_company_id: 'C-002',
      relation_type: 'subsidiary',
      ownership_percentage: 80,
    });
    expect(mockClient.post).toHaveBeenCalledWith('/consolidation/company-relations', {
      parent_company_id: 'C-001',
      child_company_id: 'C-002',
      relation_type: 'subsidiary',
      ownership_percentage: 80,
    });
  });

  it('should get company tree', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await consolidationApi.getCompanyTree();
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/company-tree');
  });

  it('should get company financial data', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { company_id: 'C-001' } });
    await consolidationApi.getCompanyFinancialData('C-001');
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/companies/C-001/financial-data');
  });

  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await consolidationApi.listScopes({ page: 1, pagesize: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/consolidation/scopes?page=1&pagesize=50');
  });
});

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
