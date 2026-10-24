import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EhsHazardousMaterialPage from '../ehs/EhsHazardousMaterialPage';
import EnvironmentPage from '../ehs/EnvironmentPage';
import HealthManagementPage from '../ehs/HealthManagementPage';
import { hazardousMaterialApi, ehsApi } from '@/api/ehs';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 但本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter 翻译，
// 避免测试环境 i18n 资源未就绪导致 t() 返回原始 key（与 locales/zh/schema.json 一致）
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const crudTranslations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
      };
      return crudTranslations[key] ?? key;
    },
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// EnvironmentPage 顶部 useQuery 拉统计（listEnvironmentMonitors page_size=100），
// 此处返回空数组避免 QueryClient 依赖，统计卡分支不影响主断言；
// lib/reactQuery 模块加载需 QueryCache 等真实导出，故部分 mock。
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: [] }),
  };
});

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/ehs', () => ({
  hazardousMaterialSchema: { name: 'hazardousMaterialSchema' },
  environmentMonitorSchema: { name: 'environmentMonitorSchema' },
  healthManagementSchema: { name: 'healthManagementSchema' },
}));

vi.mock('@/api/ehs', () => ({
  hazardousMaterialApi: {
    listHazardousMaterials: vi.fn(),
    createHazardousMaterial: vi.fn(),
    updateHazardousMaterial: vi.fn(),
    deleteHazardousMaterial: vi.fn(),
  },
  ehsApi: {
    listEnvironmentMonitors: vi.fn(),
    createEnvironmentMonitor: vi.fn(),
    updateEnvironmentMonitor: vi.fn(),
    deleteEnvironmentMonitor: vi.fn(),
    listHealthRecords: vi.fn(),
    createHealthRecord: vi.fn(),
    updateHealthRecord: vi.fn(),
    deleteHealthRecord: vi.fn(),
  },
}));

describe('EhsCrudPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hazardousMaterialApi.listHazardousMaterials).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'hm-1', material_code: 'HM-001', status: 'active' }], total: 1 },
    });
    vi.mocked(ehsApi.listEnvironmentMonitors).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'env-1', monitor_code: 'ENV-001', status: 'active' }], total: 1 },
    });
    vi.mocked(ehsApi.listHealthRecords).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'hr-1', employee_id: 'emp-1', status: 'completed' }], total: 1 },
    });
  });

  describe('EhsHazardousMaterialPage', () => {
    it('renders hazardous material page through CrudPage with EHS breadcrumbs', () => {
      render(<EhsHazardousMaterialPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'hazardousMaterialSchema' },
          breadcrumbs: [{ label: 'ehs.title' }, { label: 'pages.ehs_hazardous_material_page.k0' }],
        })
      );
    });

    it('maps hazardous material list params and unwraps response for CrudPage', async () => {
      render(<EhsHazardousMaterialPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({
        page: 2,
        pageSize: 20,
        search: 'HM',
        status: 'active',
      });

      expect(hazardousMaterialApi.listHazardousMaterials).toHaveBeenCalledWith({
        page: 2,
        page_size: 20,
        search: 'HM',
        status: 'active',
      });
      expect(result).toEqual({
        data: [{ id: 'hm-1', material_code: 'HM-001', status: 'active' }],
        total: 1,
      });
    });

    it('delegates hazardous material create, update and delete operations', async () => {
      vi.mocked(hazardousMaterialApi.createHazardousMaterial).mockResolvedValue({
        success: true,
        data: { id: 'hm-2', material_code: 'HM-002' },
      });
      vi.mocked(hazardousMaterialApi.updateHazardousMaterial).mockResolvedValue({
        success: true,
        data: { id: 'hm-1', material_code: 'HM-001' },
      });
      vi.mocked(hazardousMaterialApi.deleteHazardousMaterial).mockResolvedValue({ success: true });

      render(<EhsHazardousMaterialPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ material_code: 'HM-002' })).resolves.toEqual({
        id: 'hm-2',
        material_code: 'HM-002',
      });
      await expect(props.apiAdapter.update('hm-1', { material_code: 'HM-001' })).resolves.toEqual({
        id: 'hm-1',
        material_code: 'HM-001',
      });
      await expect(props.apiAdapter.delete('hm-1')).resolves.toBeUndefined();

      expect(hazardousMaterialApi.createHazardousMaterial).toHaveBeenCalledWith({
        material_code: 'HM-002',
      });
      expect(hazardousMaterialApi.updateHazardousMaterial).toHaveBeenCalledWith('hm-1', {
        material_code: 'HM-001',
      });
      expect(hazardousMaterialApi.deleteHazardousMaterial).toHaveBeenCalledWith('hm-1');
    });

    it('throws translated errors when hazardous material API operations fail', async () => {
      vi.mocked(hazardousMaterialApi.listHazardousMaterials).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      vi.mocked(hazardousMaterialApi.createHazardousMaterial).mockResolvedValueOnce({
        success: false,
      });
      vi.mocked(hazardousMaterialApi.updateHazardousMaterial).mockResolvedValueOnce({
        success: false,
      });
      vi.mocked(hazardousMaterialApi.deleteHazardousMaterial).mockResolvedValueOnce({
        success: false,
      });

      render(<EhsHazardousMaterialPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('hm-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('hm-1')).rejects.toThrow('删除失败');
    });
  });

  describe('EnvironmentPage', () => {
    it('renders environment page through CrudPage with EHS breadcrumbs', () => {
      render(<EnvironmentPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'environmentMonitorSchema' },
          breadcrumbs: [{ label: 'ehs.title' }, { label: 'ehs.environment_page.list' }],
        })
      );
    });

    it('maps environment list params and unwraps response for CrudPage', async () => {
      render(<EnvironmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({
        page: 3,
        pageSize: 15,
        monitor_type: 'air',
      });

      expect(ehsApi.listEnvironmentMonitors).toHaveBeenCalledWith({
        page: 3,
        page_size: 15,
        monitor_type: 'air',
      });
      expect(result).toEqual({
        data: [{ id: 'env-1', monitor_code: 'ENV-001', status: 'active' }],
        total: 1,
      });
    });

    it('delegates environment create, update and delete operations', async () => {
      vi.mocked(ehsApi.createEnvironmentMonitor).mockResolvedValue({
        success: true,
        data: { id: 'env-2', monitor_code: 'ENV-002' },
      });
      vi.mocked(ehsApi.updateEnvironmentMonitor).mockResolvedValue({
        success: true,
        data: { id: 'env-1', monitor_code: 'ENV-001' },
      });
      vi.mocked(ehsApi.deleteEnvironmentMonitor).mockResolvedValue({ success: true });

      render(<EnvironmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ monitor_code: 'ENV-002' })).resolves.toEqual({
        id: 'env-2',
        monitor_code: 'ENV-002',
      });
      await expect(props.apiAdapter.update('env-1', { monitor_code: 'ENV-001' })).resolves.toEqual({
        id: 'env-1',
        monitor_code: 'ENV-001',
      });
      await expect(props.apiAdapter.delete('env-1')).resolves.toBeUndefined();

      expect(ehsApi.createEnvironmentMonitor).toHaveBeenCalledWith({ monitor_code: 'ENV-002' });
      expect(ehsApi.updateEnvironmentMonitor).toHaveBeenCalledWith('env-1', {
        monitor_code: 'ENV-001',
      });
      expect(ehsApi.deleteEnvironmentMonitor).toHaveBeenCalledWith('env-1');
    });

    it('throws translated errors when environment API operations fail', async () => {
      vi.mocked(ehsApi.listEnvironmentMonitors).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      vi.mocked(ehsApi.createEnvironmentMonitor).mockResolvedValueOnce({ success: false });
      vi.mocked(ehsApi.updateEnvironmentMonitor).mockResolvedValueOnce({ success: false });
      vi.mocked(ehsApi.deleteEnvironmentMonitor).mockResolvedValueOnce({ success: false });

      render(<EnvironmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('env-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('env-1')).rejects.toThrow('删除失败');
    });
  });

  describe('HealthManagementPage', () => {
    it('renders health management page through CrudPage with EHS breadcrumbs', () => {
      render(<HealthManagementPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'healthManagementSchema' },
          breadcrumbs: [{ label: 'ehs.title' }, { label: 'ehs.health_management_page.list' }],
        })
      );
    });

    it('maps health record list params (keyword→q) and unwraps response', async () => {
      render(<HealthManagementPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({
        page: 1,
        pageSize: 10,
        keyword: '王',
        status: 'completed',
      });

      expect(ehsApi.listHealthRecords).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: '王',
        status: 'completed',
      });
      expect(result).toEqual({
        data: [{ id: 'hr-1', employee_id: 'emp-1', status: 'completed' }],
        total: 1,
      });
    });

    it('delegates health record create, update and delete operations', async () => {
      // createHealthRecord 后端 /health 无写路由（API 层对齐为 GET + params），如实断言
      vi.mocked(ehsApi.createHealthRecord).mockResolvedValue({
        success: true,
        data: { id: 'hr-2', employee_id: 'emp-2' },
      });
      vi.mocked(ehsApi.updateHealthRecord).mockResolvedValue({
        success: true,
        data: { id: 'hr-1', employee_id: 'emp-1' },
      });
      vi.mocked(ehsApi.deleteHealthRecord).mockResolvedValue({ success: true });

      render(<HealthManagementPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ employee_id: 'emp-2' })).resolves.toEqual({
        id: 'hr-2',
        employee_id: 'emp-2',
      });
      await expect(props.apiAdapter.update('hr-1', { employee_id: 'emp-1' })).resolves.toEqual({
        id: 'hr-1',
        employee_id: 'emp-1',
      });
      await expect(props.apiAdapter.delete('hr-1')).resolves.toBeUndefined();

      expect(ehsApi.createHealthRecord).toHaveBeenCalledWith({ employee_id: 'emp-2' });
      expect(ehsApi.updateHealthRecord).toHaveBeenCalledWith('hr-1', { employee_id: 'emp-1' });
      expect(ehsApi.deleteHealthRecord).toHaveBeenCalledWith('hr-1');
    });

    it('throws translated errors when health record API operations fail', async () => {
      vi.mocked(ehsApi.listHealthRecords).mockResolvedValueOnce({ success: false, data: null });
      vi.mocked(ehsApi.createHealthRecord).mockResolvedValueOnce({ success: false });
      vi.mocked(ehsApi.updateHealthRecord).mockResolvedValueOnce({ success: false });
      vi.mocked(ehsApi.deleteHealthRecord).mockResolvedValueOnce({ success: false });

      render(<HealthManagementPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('hr-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('hr-1')).rejects.toThrow('删除失败');
    });
  });
});
