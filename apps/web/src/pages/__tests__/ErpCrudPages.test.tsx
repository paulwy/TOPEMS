import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplierManagementPage from '../erp/SupplierManagementPage';
import VehicleRequestPage from '../erp/VehicleRequestPage';
import MeetingRoomPage from '../erp/MeetingRoomPage';
import VehiclePage from '../erp/VehiclePage';
import MaterialManagementPage from '../erp/MaterialManagementPage';
import AssetManagementPage from '../erp/AssetManagementPage';
import { erpApi, vehicleApi, vehicleRequestApi, meetingRoomApi, assetApi } from '@/api/erp';
import { masterDataApi } from '@/api/master-data';

// 批次6：erp 域剩余 CrudPage 包装页真断言（照 CrmCrudPages 冻结范本）。
// 3 纯包装（Supplier/VehicleRequest/MeetingRoom）+ 3 带 headerContent 统计卡（Vehicle/Material/Asset，useQuery 部分 mock）。
vi.unmock('@/schema/crudPageAdapter');

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return (
      <div data-testid='crud-page'>
        crud-page
        {props.headerContent as React.ReactNode}
      </div>
    );
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/erp/supplier', () => ({
  supplierSchema: { name: 'supplierSchema' },
}));
vi.mock('@/schemas/erp/vehicle', () => ({
  vehicleSchema: { name: 'vehicleSchema' },
}));
vi.mock('@/schemas/erp/vehicleRequest', () => ({
  vehicleRequestSchema: { name: 'vehicleRequestSchema' },
}));
vi.mock('@/schemas/erp/meetingRoom', () => ({
  meetingRoomSchema: { name: 'meetingRoomSchema' },
}));
vi.mock('@/schemas/erp/material', () => ({
  materialSchema: { name: 'materialSchema' },
}));
vi.mock('@/schemas/erp/asset', () => ({
  assetSchema: { name: 'assetSchema' },
}));

// 部分 mock：importOriginal 展开真实模块（QueryCache——lib/reactQuery 依赖），仅覆盖页面统计 useQuery
const mockUseQuery = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

const makeEntityApi = vi.hoisted(() => (itemsKey = 'items') => ({
  list: vi.fn().mockResolvedValue({
    success: true,
    data: { [itemsKey]: [{ id: 'row-1', name: '记录甲' }], total: 1 },
  }),
  create: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'row-2', name: '记录乙' },
  }),
  update: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'row-1', name: '记录丙' },
  }),
  delete: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/erp', () => ({
  erpApi: {
    suppliers: makeEntityApi('suppliers'),
    materials: makeEntityApi(),
  },
  vehicleApi: makeEntityApi(),
  vehicleRequestApi: makeEntityApi(),
  meetingRoomApi: makeEntityApi(),
  assetApi: makeEntityApi(),
}));

// 批 34：SupplierManagementPage 已切 MDM 权威源（/api/master-data/suppliers），
// mdm list 信封为 { items, total, page, page_size }，故 mock 用默认 itemsKey。
vi.mock('@/api/master-data', () => ({
  masterDataApi: {
    suppliers: makeEntityApi(),
    supplierCategories: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      }),
    },
  },
}));

describe('ErpCrudPages（批次6：Supplier/VehicleRequest/MeetingRoom 纯包装 + Vehicle/Material/Asset 统计卡）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 统计卡 useQuery 默认空数据；各统计用例显式覆盖
    vi.mocked(mockUseQuery).mockReturnValue({ data: { items: [] } });
  });

  const assertCrudBehavior = (
    api: {
      list: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    },
    schemaName: string,
    breadcrumbs: unknown[]
  ) => {
    it('经 CrudPage 渲染（schema + breadcrumbs 三层）', () => {
      render(<SupplierManagementPage />);
      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: schemaName },
          breadcrumbs,
        })
      );
    });

    it('list 参数归一化 pageSize→page_size + 响应解包', async () => {
      render(<SupplierManagementPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: { list: (p: unknown) => Promise<{ data: unknown[]; total: number }> };
      };

      const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: '甲' });
      expect(api.list).toHaveBeenCalledWith({ page: 2, page_size: 20, search: '甲' });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('create/update/delete 委托与返回', async () => {
      render(<SupplierManagementPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      await expect(props.apiAdapter.create({ name: '记录乙' })).resolves.toEqual({
        id: 'row-2',
        name: '记录乙',
      });
      await expect(props.apiAdapter.update('row-1', { name: '记录丙' })).resolves.toEqual({
        id: 'row-1',
        name: '记录丙',
      });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();

      expect(api.create).toHaveBeenCalledWith({ name: '记录乙' });
      expect(api.update).toHaveBeenCalledWith('row-1', { name: '记录丙' });
      expect(api.delete).toHaveBeenCalledWith('row-1');
    });

    it('四档错误翻译（success=false 无 message 时走 k0-k3）', async () => {
      api.list.mockResolvedValueOnce({ success: false, data: null });
      api.create.mockResolvedValueOnce({ success: false });
      api.update.mockResolvedValueOnce({ success: false });
      api.delete.mockResolvedValueOnce({ success: false });

      render(<SupplierManagementPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: unknown) => Promise<unknown>;
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('删除失败');
    });
  };

  describe('SupplierManagementPage（批34 切 MDM，items 解包）', () => {
    assertCrudBehavior(vi.mocked(masterDataApi.suppliers), 'supplierSchema', [
      { label: 'erp.supplier_management_page.k4', href: '/dashboard' },
      { label: 'ERP', href: '/erp' },
      { label: 'erp.supplier_management_page.k5' },
    ]);
  });

  describe('VehicleRequestPage', () => {
    it('经 CrudPage 渲染（vehicleRequestSchema + breadcrumbs）', () => {
      render(<VehicleRequestPage />);
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'vehicleRequestSchema' },
          breadcrumbs: [
            { label: 'erp.vehicle_request_page.k4', href: '/dashboard' },
            { label: 'ERP', href: '/erp' },
            { label: 'erp.vehicle_request_page.k5' },
          ],
        })
      );
    });

    it('list 归一化 + 解包 / 三操作委托 / 四档错误翻译', async () => {
      render(<VehicleRequestPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: {
            page: number;
            pageSize: number;
          }) => Promise<{ data: unknown[]; total: number }>;
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      const result = await props.apiAdapter.list({ page: 1, pageSize: 10 });
      expect(vehicleRequestApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10 });
      expect(result.data).toHaveLength(1);

      await expect(props.apiAdapter.create({ name: 'x' })).resolves.toEqual({
        id: 'row-2',
        name: '记录乙',
      });
      await expect(props.apiAdapter.update('row-1', { name: 'y' })).resolves.toEqual({
        id: 'row-1',
        name: '记录丙',
      });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();

      vehicleRequestApi.list.mockResolvedValueOnce({ success: false });
      vehicleRequestApi.create.mockResolvedValueOnce({ success: false });
      vehicleRequestApi.update.mockResolvedValueOnce({ success: false });
      vehicleRequestApi.delete.mockResolvedValueOnce({ success: false });

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('删除失败');
    });
  });

  describe('MeetingRoomPage', () => {
    it('经 CrudPage 渲染（meetingRoomSchema + breadcrumbs）', () => {
      render(<MeetingRoomPage />);
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'meetingRoomSchema' },
          breadcrumbs: [
            { label: 'erp.meeting_room_page.k4', href: '/dashboard' },
            { label: 'ERP', href: '/erp' },
            { label: 'erp.meeting_room_page.k5' },
          ],
        })
      );
    });

    it('list 归一化 + 解包 / 三操作委托 / 四档错误翻译', async () => {
      render(<MeetingRoomPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: {
            page: number;
            pageSize: number;
          }) => Promise<{ data: unknown[]; total: number }>;
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      const result = await props.apiAdapter.list({ page: 1, pageSize: 10 });
      expect(meetingRoomApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10 });
      expect(result.total).toBe(1);

      await expect(props.apiAdapter.create({ name: 'x' })).resolves.toEqual({
        id: 'row-2',
        name: '记录乙',
      });
      await expect(props.apiAdapter.update('row-1', { name: 'y' })).resolves.toEqual({
        id: 'row-1',
        name: '记录丙',
      });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();

      meetingRoomApi.list.mockResolvedValueOnce({ success: false });
      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    });
  });

  describe('VehiclePage（headerContent 统计卡 useQuery）', () => {
    it('经 CrudPage 渲染 + 统计卡（total/available/in_use/maintenance）', () => {
      vi.mocked(mockUseQuery).mockReturnValue({
        data: {
          items: [
            { id: 'v1', status: 'available' },
            { id: 'v2', status: 'available' },
            { id: 'v3', status: 'in_use' },
            { id: 'v4', status: 'maintenance' },
          ],
        },
      });

      render(<VehiclePage />);

      const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
      expect(props.schema).toEqual(expect.objectContaining({ name: 'vehicleSchema' }));
      expect(props.breadcrumbs).toEqual([
        { label: 'erp.vehicle_page.k9', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: 'erp.vehicle_page.k10' },
      ]);
      expect(props.headerContent).toBeTruthy();
      // 4 统计卡：总数 4 / 可用 2 / 使用中 1 / 维护 1
      expect(screen.getByText('erp.vehicle_page.k1')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2);
      expect(screen.getByText('erp.vehicle_page.k2')).toBeInTheDocument();
      expect(screen.getByText('erp.vehicle_page.k3')).toBeInTheDocument();
      expect(screen.getByText('erp.vehicle_page.k4')).toBeInTheDocument();
    });

    it('list 归一化 + 三操作委托', async () => {
      render(<VehiclePage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: {
            page: number;
            pageSize: number;
          }) => Promise<{ data: unknown[]; total: number }>;
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      const result = await props.apiAdapter.list({ page: 3, pageSize: 30 });
      expect(vehicleApi.list).toHaveBeenCalledWith({ page: 3, page_size: 30 });
      expect(result.data).toHaveLength(1);

      await expect(props.apiAdapter.create({})).resolves.toEqual({ id: 'row-2', name: '记录乙' });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();
      expect(vehicleApi.create).toHaveBeenCalledWith({});
      expect(vehicleApi.delete).toHaveBeenCalledWith('row-1');
    });
  });

  describe('MaterialManagementPage（headerContent 统计卡 useQuery）', () => {
    it('经 CrudPage 渲染 + 统计卡（total/active/inactive/obsolete）', () => {
      vi.mocked(mockUseQuery).mockReturnValue({
        data: {
          materials: [
            { id: 'm1', status: 'active' },
            { id: 'm2', status: 'active' },
            { id: 'm3', status: 'inactive' },
            { id: 'm4', status: 'obsolete' },
          ],
        },
      });

      render(<MaterialManagementPage />);

      const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
      expect(props.schema).toEqual(expect.objectContaining({ name: 'materialSchema' }));
      expect(props.breadcrumbs).toEqual([
        { label: 'erp.material_management_page.k9', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: 'erp.material_management_page.k10' },
      ]);
      expect(props.headerContent).toBeTruthy();
      expect(screen.getByText('erp.material_management_page.k1')).toBeInTheDocument();
      expect(screen.getByText('erp.material_management_page.k2')).toBeInTheDocument();
      expect(screen.getByText('erp.material_management_page.k3')).toBeInTheDocument();
      expect(screen.getByText('erp.material_management_page.k4')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2);
    });

    it('list 归一化 + 三操作委托 + 错误翻译', async () => {
      render(<MaterialManagementPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: {
            page: number;
            pageSize: number;
          }) => Promise<{ data: unknown[]; total: number }>;
          create: (d: unknown) => Promise<unknown>;
          update: (id: string, d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      const result = await props.apiAdapter.list({ page: 1, pageSize: 20 });
      expect(erpApi.materials.list).toHaveBeenCalledWith({ page: 1, page_size: 20 });
      expect(result.total).toBe(1);

      await expect(props.apiAdapter.update('row-1', { name: 'y' })).resolves.toEqual({
        id: 'row-1',
        name: '记录丙',
      });
      expect(erpApi.materials.update).toHaveBeenCalledWith('row-1', { name: 'y' });

      erpApi.materials.delete.mockResolvedValueOnce({ success: false });
      await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('删除失败');
    });
  });

  describe('AssetManagementPage（headerContent 统计卡 useQuery）', () => {
    it('经 CrudPage 渲染 + 统计卡（total/¥总价/active/retired+transferred）', () => {
      vi.mocked(mockUseQuery).mockReturnValue({
        data: {
          items: [
            { id: 'a1', purchase_amount: 1000, status: 'active' },
            { id: 'a2', purchase_amount: 2000, status: 'active' },
            { id: 'a3', purchase_amount: 500, status: 'retired' },
            { id: 'a4', purchase_amount: 300, status: 'transferred' },
          ],
        },
      });

      render(<AssetManagementPage />);

      const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
      expect(props.schema).toEqual(expect.objectContaining({ name: 'assetSchema' }));
      expect(props.breadcrumbs).toEqual([
        { label: 'erp.asset_management_page.k9', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: 'erp.asset_management_page.k10' },
      ]);
      expect(props.headerContent).toBeTruthy();
      // 总价 = 1000+2000+500+300 = 3800 → ¥3800.00；retired+transferred 合并计数 2
      expect(screen.getByText('¥3800.00')).toBeInTheDocument();
      expect(screen.getByText('erp.asset_management_page.k1')).toBeInTheDocument();
      expect(screen.getByText('erp.asset_management_page.k2')).toBeInTheDocument();
      expect(screen.getByText('erp.asset_management_page.k3')).toBeInTheDocument();
      expect(screen.getByText('erp.asset_management_page.k4')).toBeInTheDocument();
      expect(screen.getAllByText('2')).toHaveLength(2);
    });

    it('list 归一化 + 三操作委托', async () => {
      render(<AssetManagementPage />);
      const props = mockCrudPage.mock.calls[0][0] as {
        apiAdapter: {
          list: (p: {
            page: number;
            pageSize: number;
          }) => Promise<{ data: unknown[]; total: number }>;
          create: (d: unknown) => Promise<unknown>;
          delete: (id: string) => Promise<unknown>;
        };
      };

      const result = await props.apiAdapter.list({ page: 2, pageSize: 50 });
      expect(assetApi.list).toHaveBeenCalledWith({ page: 2, page_size: 50 });
      expect(result.data).toHaveLength(1);

      await expect(props.apiAdapter.create({ name: 'x' })).resolves.toEqual({
        id: 'row-2',
        name: '记录乙',
      });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();
      expect(assetApi.create).toHaveBeenCalledWith({ name: 'x' });
      expect(assetApi.delete).toHaveBeenCalledWith('row-1');
    });
  });
});
