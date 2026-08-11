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

describe('HRM Setup API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hrmSetupApi - 初始化向导', () => {
    it('getInitProgress should call GET /setup/progress', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.get as vi.Mock).mockResolvedValue({ data: {} });
      await hrmSetupApi.getInitProgress();
      expect(apiClient.hrm.get).toHaveBeenCalledWith('/setup/progress');
    });

    it('setupCompanyInfo should call POST /setup/company', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.post as vi.Mock).mockResolvedValue({ data: {} });
      const data: CompanyInfoRequest = {
        name: '测试公司',
        short_name: 'TC',
        contact_phone: '13800138000',
        email: 'test@example.com',
      };
      await hrmSetupApi.setupCompanyInfo(data);
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/setup/company', data);
    });

    it('setupDepartments should call POST /setup/departments', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        departments: [
          { name: '技术部', code: 'TECH' },
          { name: '市场部', code: 'MKT' },
        ],
      };
      await hrmSetupApi.setupDepartments(data);
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/setup/departments', data);
    });

    it('setupPositions should call POST /setup/positions', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        positions: [
          { name: '前端工程师', level: 3 },
          { name: '产品经理', level: 4 },
        ],
      };
      await hrmSetupApi.setupPositions(data);
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/setup/positions', data);
    });

    it('setupAdminUser should call POST /setup/admin', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        name: '管理员',
        employee_number: 'EMP-001',
        department_id: 'dept-001',
        email: 'admin@example.com',
        password: 'password123',
      };
      await hrmSetupApi.setupAdminUser(data);
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/setup/admin', data);
    });

    it('completeInitialization should call POST /setup/complete', async () => {
      const { hrmSetupApi } = await import('../hrm/hrmSetup');
      const { apiClient } = await import('../client');
      (apiClient.hrm.post as vi.Mock).mockResolvedValue({ data: {} });
      await hrmSetupApi.completeInitialization({ confirm: true });
      expect(apiClient.hrm.post).toHaveBeenCalledWith('/setup/complete', { confirm: true });
    });
  });
});

type CompanyInfoRequest = {
  name: string;
  short_name?: string;
  contact_phone?: string;
  email?: string;
};
