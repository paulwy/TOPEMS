import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildQueryString } from '../types';
import { employeeApi, roleApi, positionApi, employeePerformanceApi } from '../employee';
import { departmentApi } from '../department';
import { attendanceApi } from '../attendance';
import { leaveApi } from '../leave';
import { jobOpeningApi, candidateApi, interviewApi } from '../recruitment';
import { payrollApi, payrollItemApi, salaryAdjustmentApi } from '../payroll';
import { performanceReviewApi, performanceGoalApi } from '../performance';
import { contractApi, contractRenewalApi } from '../contract';
import { trainingPlanApi, trainingCourseApi, trainingRecordApi } from '../training';
import { companyApi } from '../company';
import apiClient from '../../client';

vi.mock('../../client', () => ({
  default: {
    hrm: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('HRM API types - buildQueryString', () => {
  it('should return empty string when params is undefined', () => {
    expect(buildQueryString(undefined)).toBe('');
  });

  it('should return empty string when params is null', () => {
    expect(buildQueryString(null as unknown as Record<string, string | number>)).toBe('');
  });

  it('should return empty string when params is empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('should build query string with single parameter', () => {
    expect(buildQueryString({ page: 1 })).toBe('?page=1');
  });

  it('should build query string with multiple parameters', () => {
    const result = buildQueryString({ page: 1, pagesize: 10, search: 'test' });
    expect(result).toContain('page=1');
    expect(result).toContain('pagesize=10');
    expect(result).toContain('search=test');
  });

  it('should skip undefined and null values', () => {
    const result = buildQueryString({
      page: 1,
      search: undefined,
      status: null as unknown as string,
    });
    expect(result).toBe('?page=1');
  });

  it('should handle numeric values', () => {
    expect(buildQueryString({ page: 2, pagesize: 20 })).toBe('?page=2&pagesize=20');
  });

  it('should handle special characters in search', () => {
    const result = buildQueryString({ search: 'John Doe' });
    expect(result).toBe('?search=John+Doe');
  });
});

describe('HRM employeeApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /employees with query string for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await employeeApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/employees?page=1&pagesize=10');
  });

  it('should call GET /employees without query string when no params', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await employeeApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/employees');
  });

  it('should call GET /employees/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await employeeApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/employees/1');
  });

  it('should call POST /employees for create', async () => {
    const data = { name: 'John', employee_no: 'EMP001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await employeeApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/employees', data);
  });

  it('should call PUT /employees/:id for update', async () => {
    const data = { name: 'John Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await employeeApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/employees/1', data);
  });

  it('should call DELETE /employees/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await employeeApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/employees/1');
  });
});

describe('HRM roleApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /roles for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await roleApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/roles?page=1');
  });

  it('should call GET /roles/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await roleApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/roles/1');
  });

  it('should call POST /roles for create', async () => {
    const data = { name: 'Admin', code: 'admin' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await roleApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/roles', data);
  });

  it('should call PUT /roles/:id for update', async () => {
    const data = { name: 'Admin Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await roleApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/roles/1', data);
  });

  it('should call DELETE /roles/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await roleApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/roles/1');
  });
});

describe('HRM positionApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /positions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await positionApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/positions');
  });

  it('should call GET /positions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await positionApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/positions/1');
  });

  it('should call POST /positions for create', async () => {
    const data = { name: 'Manager', code: 'mgr' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await positionApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/positions', data);
  });

  it('should call PUT /positions/:id for update', async () => {
    const data = { name: 'Senior Manager' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await positionApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/positions/1', data);
  });

  it('should call DELETE /positions/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await positionApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/positions/1');
  });
});

describe('HRM departmentApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /departments for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await departmentApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/departments?page=1&pagesize=10');
  });

  it('should call GET /departments/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1', name: 'IT' } });
    await departmentApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/departments/1');
  });

  it('should call POST /departments for create', async () => {
    const data = { name: 'Engineering', code: 'ENG' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await departmentApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/departments', data);
  });

  it('should call PUT /departments/:id for update', async () => {
    const data = { name: 'Engineering Dept' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await departmentApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/departments/1', data);
  });

  it('should call DELETE /departments/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await departmentApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/departments/1');
  });
});

describe('HRM attendanceApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /attendance for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await attendanceApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/attendance?page=1&pagesize=10');
  });

  it('should call GET /attendance/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await attendanceApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/1');
  });

  it('should call POST /attendance for create', async () => {
    const data = { employee_id: 'EMP001', check_in_time: '09:00' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await attendanceApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/attendance', data);
  });

  it('should call PUT /attendance/:id for update', async () => {
    const data = { check_out_time: '18:00' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await attendanceApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/attendance/1', data);
  });

  it('should call DELETE /attendance/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await attendanceApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/attendance/1');
  });

  it('should call POST /attendance/check-in for checkIn', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await attendanceApi.checkIn('EMP001');
    expect(mockApiClient.post).toHaveBeenCalledWith('/attendance/check-in', {
      employee_id: 'EMP001',
    });
  });

  it('should call POST /attendance/check-out for checkOut', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await attendanceApi.checkOut('EMP001');
    expect(mockApiClient.post).toHaveBeenCalledWith('/attendance/check-out', {
      employee_id: 'EMP001',
    });
  });
});

describe('HRM leaveApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /leaves for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await leaveApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/leaves?page=1&pagesize=10');
  });

  it('should call GET /leaves/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await leaveApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/leaves/1');
  });

  it('should call POST /leaves for create', async () => {
    const data = {
      employee_id: 'EMP001',
      leave_type: 'annual',
      start_date: '2024-01-01',
      end_date: '2024-01-03',
    };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await leaveApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/leaves', data);
  });

  it('should call PUT /leaves/:id for update', async () => {
    const data = { reason: 'Updated reason' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await leaveApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/leaves/1', data);
  });

  it('should call DELETE /leaves/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await leaveApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/leaves/1');
  });

  it('should call PUT /leaves/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'approved' } });
    await leaveApi.approve('1', 'APP001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/leaves/1/approve', { approver_id: 'APP001' });
  });

  it('should call PUT /leaves/:id/reject for reject', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'rejected' } });
    await leaveApi.reject('1', 'APP001', 'Insufficient notice');
    expect(mockApiClient.put).toHaveBeenCalledWith('/leaves/1/reject', {
      approver_id: 'APP001',
      reason: 'Insufficient notice',
    });
  });
});

describe('HRM jobOpeningApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /job-openings for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await jobOpeningApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/job-openings?page=1');
  });

  it('should call GET /job-openings/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1', title: 'Developer' } });
    await jobOpeningApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/job-openings/1');
  });

  it('should call POST /job-openings for create', async () => {
    const data = { title: 'Senior Developer', department_id: '1', location: 'Shanghai' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await jobOpeningApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/job-openings', data);
  });

  it('should call PUT /job-openings/:id for update', async () => {
    const data = { title: 'Lead Developer' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await jobOpeningApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/job-openings/1', data);
  });

  it('should call DELETE /job-openings/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await jobOpeningApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/job-openings/1');
  });

  it('should call PUT /job-openings/:id/publish for publish', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'published' } });
    await jobOpeningApi.publish('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/job-openings/1/publish');
  });

  it('should call PUT /job-openings/:id/close for close', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'closed' } });
    await jobOpeningApi.close('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/job-openings/1/close');
  });
});

describe('HRM candidateApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /candidates for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await candidateApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/candidates?page=1');
  });

  it('should call GET /candidates/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1', name: 'John' } });
    await candidateApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/candidates/1');
  });

  it('should call POST /candidates for create', async () => {
    const data = { name: 'John Doe', email: 'john@example.com', phone: '13800000000' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await candidateApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/candidates', data);
  });

  it('should call PUT /candidates/:id for update', async () => {
    const data = { status: 'interviewing' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await candidateApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/candidates/1', data);
  });

  it('should call DELETE /candidates/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await candidateApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/candidates/1');
  });
});

describe('HRM interviewApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /interviews for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await interviewApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/interviews?page=1');
  });

  it('should call GET /interviews/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await interviewApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/interviews/1');
  });

  it('should call POST /interviews for create', async () => {
    const data = { candidate_id: '1', job_opening_id: '1', interview_date: '2024-01-15' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await interviewApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/interviews', data);
  });

  it('should call PUT /interviews/:id for update', async () => {
    const data = { interview_date: '2024-01-16' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await interviewApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/interviews/1', data);
  });

  it('should call DELETE /interviews/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await interviewApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/interviews/1');
  });

  it('should call PUT /interviews/:id/complete for complete', async () => {
    const data = { result: 'passed', score: 85 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await interviewApi.complete('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/interviews/1/complete', data);
  });
});

describe('HRM payrollApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /payroll-runs for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await payrollApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/payroll-runs?page=1');
  });

  it('should call GET /payroll-runs/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { run: {}, items: [] } });
    await payrollApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/payroll-runs/1');
  });

  it('should call POST /payroll-runs for create', async () => {
    const data = { pay_period: '2024-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await payrollApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/payroll-runs', data);
  });

  it('should call DELETE /payroll-runs/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await payrollApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/payroll-runs/1');
  });

  it('should call PUT /payroll-runs/:id/calculate for calculate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'calculated' } });
    await payrollApi.calculate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/payroll-runs/1/calculate');
  });

  it('should call PUT /payroll-runs/:id/pay for pay', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'paid' } });
    await payrollApi.pay('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/payroll-runs/1/pay');
  });
});

describe('HRM payrollItemApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /payroll-items for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await payrollItemApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/payroll-items?page=1');
  });

  it('should call GET /payroll-items/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { item: {}, details: [] } });
    await payrollItemApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/payroll-items/1');
  });
});

describe('HRM salaryAdjustmentApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /salary-adjustments for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await salaryAdjustmentApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/salary-adjustments?page=1');
  });

  it('should call GET /salary-adjustments/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await salaryAdjustmentApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/salary-adjustments/1');
  });

  it('should call POST /salary-adjustments for create', async () => {
    const data = { employee_id: 'EMP001', amount: 1000, reason: 'Annual raise' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await salaryAdjustmentApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/salary-adjustments', data);
  });

  it('should call PUT /salary-adjustments/:id for update', async () => {
    const data = { amount: 1500 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await salaryAdjustmentApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/salary-adjustments/1', data);
  });

  it('should call DELETE /salary-adjustments/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await salaryAdjustmentApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/salary-adjustments/1');
  });

  it('should call PUT /salary-adjustments/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'approved' } });
    await salaryAdjustmentApi.approve('1', 'APP001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/salary-adjustments/1/approve', {
      approver_id: 'APP001',
    });
  });

  it('should call PUT /salary-adjustments/:id/reject for reject', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'rejected' } });
    await salaryAdjustmentApi.reject('1', 'APP001', 'Budget not approved');
    expect(mockApiClient.put).toHaveBeenCalledWith('/salary-adjustments/1/reject', {
      approver_id: 'APP001',
      reason: 'Budget not approved',
    });
  });
});

describe('HRM performanceReviewApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /performance-reviews for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await performanceReviewApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/performance-reviews?page=1');
  });

  it('should call GET /performance-reviews/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await performanceReviewApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/performance-reviews/1');
  });

  it('should call POST /performance-reviews for create', async () => {
    const data = { employee_id: 'EMP001', review_period: '2024-Q1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await performanceReviewApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/performance-reviews', data);
  });

  it('should call PUT /performance-reviews/:id for update', async () => {
    const data = { rating: 4.5 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await performanceReviewApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/performance-reviews/1', data);
  });

  it('should call DELETE /performance-reviews/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await performanceReviewApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/performance-reviews/1');
  });

  it('should call PUT /performance-reviews/:id/submit for submit', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'submitted' } });
    await performanceReviewApi.submit('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/performance-reviews/1/submit');
  });

  it('should call PUT /performance-reviews/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'approved' } });
    await performanceReviewApi.approve('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/performance-reviews/1/approve');
  });
});

describe('HRM performanceGoalApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /performance-goals for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await performanceGoalApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/performance-goals?page=1');
  });

  it('should call GET /performance-goals/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await performanceGoalApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/performance-goals/1');
  });

  it('should call POST /performance-goals for create', async () => {
    const data = { employee_id: 'EMP001', title: 'Increase sales', target: 100000 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await performanceGoalApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/performance-goals', data);
  });

  it('should call PUT /performance-goals/:id for update', async () => {
    const data = { target: 120000 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await performanceGoalApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/performance-goals/1', data);
  });

  it('should call DELETE /performance-goals/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await performanceGoalApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/performance-goals/1');
  });
});

describe('HRM contractApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /contracts for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await contractApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/contracts?page=1');
  });

  it('should call GET /contracts/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { contract: {}, renewals: [] } });
    await contractApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/contracts/1');
  });

  it('should call POST /contracts for create', async () => {
    const data = {
      employee_id: 'EMP001',
      start_date: '2024-01-01',
      end_date: '2027-01-01',
      contract_type: 'full-time',
    };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await contractApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/contracts', data);
  });

  it('should call PUT /contracts/:id for update', async () => {
    const data = { end_date: '2028-01-01' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await contractApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/contracts/1', data);
  });

  it('should call DELETE /contracts/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await contractApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/contracts/1');
  });

  it('should call GET /contracts/expiring for getExpiring', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await contractApi.getExpiring({ days: 30 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call POST /contracts/:id/renew for renew', async () => {
    const data = { new_end_date: '2028-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await contractApi.renew('1', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/contracts/1/renew', data);
  });
});

describe('HRM contractRenewalApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /contract-renewals for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await contractRenewalApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/contract-renewals?page=1');
  });

  it('should call GET /contract-renewals/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await contractRenewalApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/contract-renewals/1');
  });

  it('should call PUT /contract-renewals/:id for update', async () => {
    const data = { status: 'pending' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await contractRenewalApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/contract-renewals/1', data);
  });

  it('should call DELETE /contract-renewals/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await contractRenewalApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/contract-renewals/1');
  });

  it('should call PUT /contract-renewals/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'approved' } });
    await contractRenewalApi.approve('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/contract-renewals/1/approve');
  });

  it('should call PUT /contract-renewals/:id/reject for reject', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'rejected' } });
    await contractRenewalApi.reject('1', 'Budget not approved');
    expect(mockApiClient.put).toHaveBeenCalledWith('/contract-renewals/1/reject', {
      reason: 'Budget not approved',
    });
  });

  it('should call PUT /contract-renewals/:id/execute for execute', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: {} });
    await contractRenewalApi.execute('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/contract-renewals/1/execute');
  });
});

describe('HRM trainingPlanApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /training-plans for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await trainingPlanApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-plans?page=1');
  });

  it('should call GET /training-plans/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await trainingPlanApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-plans/1');
  });

  it('should call POST /training-plans for create', async () => {
    const data = { title: 'Technical Training', description: 'Learn React' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await trainingPlanApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/training-plans', data);
  });

  it('should call PUT /training-plans/:id for update', async () => {
    const data = { title: 'Advanced Technical Training' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await trainingPlanApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-plans/1', data);
  });

  it('should call DELETE /training-plans/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await trainingPlanApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/training-plans/1');
  });

  it('should call PUT /training-plans/:id/activate for activate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'active' } });
    await trainingPlanApi.activate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-plans/1/activate');
  });

  it('should call PUT /training-plans/:id/deactivate for deactivate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'inactive' } });
    await trainingPlanApi.deactivate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-plans/1/deactivate');
  });
});

describe('HRM trainingCourseApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /training-courses for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await trainingCourseApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-courses?page=1');
  });

  it('should call GET /training-courses/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await trainingCourseApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-courses/1');
  });

  it('should call POST /training-courses for create', async () => {
    const data = { title: 'React Basics', duration_hours: 20 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await trainingCourseApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/training-courses', data);
  });

  it('should call PUT /training-courses/:id for update', async () => {
    const data = { duration_hours: 25 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await trainingCourseApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-courses/1', data);
  });

  it('should call DELETE /training-courses/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await trainingCourseApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/training-courses/1');
  });
});

describe('HRM trainingRecordApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /training-records for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await trainingRecordApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-records?page=1');
  });

  it('should call GET /training-records/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await trainingRecordApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/training-records/1');
  });

  it('should call POST /training-records for create', async () => {
    const data = { course_id: '1', employee_id: 'EMP001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await trainingRecordApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/training-records', data);
  });

  it('should call PUT /training-records/:id for update', async () => {
    const data = { status: 'completed' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await trainingRecordApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-records/1', data);
  });

  it('should call DELETE /training-records/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await trainingRecordApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/training-records/1');
  });

  it('should call POST /training-courses/:courseId/enroll for enroll', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await trainingRecordApi.enroll('COURSE001', 'EMP001');
    expect(mockApiClient.post).toHaveBeenCalledWith('/training-courses/COURSE001/enroll', {
      course_id: 'COURSE001',
      employee_id: 'EMP001',
    });
  });

  it('should call PUT /training-records/:id/complete for complete', async () => {
    const data = { score: 90, completion_date: '2024-01-15' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await trainingRecordApi.complete('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/training-records/1/complete', data);
  });
});

describe('HRM companyApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /companies for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await companyApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/companies?page=1');
  });

  it('should call GET /companies/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1', name: 'Acme Corp' } });
    await companyApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/companies/1');
  });

  it('should call POST /companies for create', async () => {
    const data = { name: 'New Company', tax_number: '123456789' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await companyApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/companies', data);
  });

  it('should call PUT /companies/:id for update', async () => {
    const data = { name: 'Updated Company' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await companyApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/companies/1', data);
  });

  it('should call DELETE /companies/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await companyApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/companies/1');
  });
});

describe('HRM employeePerformanceApi', () => {
  const mockApiClient = apiClient.hrm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /employees/:id/performance-reviews for getReviews', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await employeePerformanceApi.getReviews('EMP001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/employees/EMP001/performance-reviews');
  });

  it('should call GET /employees/:id/performance-goals for getGoals', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await employeePerformanceApi.getGoals('EMP001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/employees/EMP001/performance-goals');
  });
});
