import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockHrmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { hrm: mockHrmClient },
    default: { hrm: mockHrmClient },
  };
});

describe('HRM Reports API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hrmReportsApi', () => {
    it('getEmployeeSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getEmployeeSummary({
        start_date: '2026-01-01',
        end_date: '2026-08-27',
        department_id: 'dept-001',
        time_range: 'month',
      });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/reports/employee-summary?start_date=2026-01-01&end_date=2026-08-27&department_id=dept-001&time_range=month'
      );
    });

    it('getEmployeeSummary should call GET without params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getEmployeeSummary();
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/reports/employee-summary');
    });

    it('getDepartmentSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: [] });
      await hrmReportsApi.getDepartmentSummary({ time_range: 'quarter' });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/reports/department-summary?time_range=quarter'
      );
    });

    it('getContractSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getContractSummary({ start_date: '2026-01-01', end_date: '2026-08-27' });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/reports/contract-summary?start_date=2026-01-01&end_date=2026-08-27'
      );
    });

    it('getTrainingSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getTrainingSummary({ time_range: 'year' });
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/reports/training-summary?time_range=year');
    });

    it('getAttendanceSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getAttendanceSummary({ department_id: 'dept-001' });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/reports/attendance-summary?department_id=dept-001'
      );
    });

    it('getPayrollSummary should call GET with params', async () => {
      const { hrmReportsApi } = await import('../hrm/hrmReports');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmReportsApi.getPayrollSummary({ start_date: '2026-01-01' });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/reports/payroll-summary?start_date=2026-01-01'
      );
    });
  });
});

describe('HRM Audit API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hrmAuditApi', () => {
    it('listAuditLogs should call GET with all params', async () => {
      const { hrmAuditApi } = await import('../hrm/hrmAudit');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hrmAuditApi.listAuditLogs({
        page: 1,
        page_size: 20,
        action: 'create',
        entity_type: 'employee',
        user_id: 'user-001',
        status: 'success',
        start_date: '2026-01-01',
        end_date: '2026-08-27',
      });
      expect(apiClient.hrm.get).toHaveBeenCalledWith(
        '/audit-logs?page=1&page_size=20&action=create&entity_type=employee&user_id=user-001&status=success&start_date=2026-01-01&end_date=2026-08-27'
      );
    });

    it('listAuditLogs should call GET without params', async () => {
      const { hrmAuditApi } = await import('../hrm/hrmAudit');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hrmAuditApi.listAuditLogs();
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/audit-logs');
    });

    it('getAuditLog should call GET /audit-logs/:id', async () => {
      const { hrmAuditApi } = await import('../hrm/hrmAudit');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmAuditApi.getAuditLog('log-001');
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/audit-logs/log-001');
    });
  });
});
