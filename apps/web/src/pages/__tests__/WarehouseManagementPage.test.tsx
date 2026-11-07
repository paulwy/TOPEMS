import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarehouseManagementPage from '../wms/WarehouseManagementPage';
import { wmsApi } from '@/api/wms';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通 (api)=>api；
// 本页在模块加载时即调用 createCrudPageAdapter(wmsApi.warehouses) 构造真实适配器，
// 这里恢复真实实现以验证参数归一化(pageSize→page_size)/响应解包/错误翻译。
vi.unmock('@/schema/crudPageAdapter');

// 真实适配器与 createListPageCrudApi 均直接用全局 i18n.t（非 react-i18next hook），
// 显式提供 crud_page_adapter 翻译表与本页面包屑译文（与 locales/zh 一致），
// 避免 t() 返回原始 key。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'pages.warehouse_management_page.k4': '首页',
        'pages.warehouse_management_page.k5': '仓储管理',
        'pages.warehouse_management_page.k6': '仓库管理',
      };
      return translations[key] ?? key;
    },
    exists: () => true,
  },
}));

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// 本页渲染 ListPageTemplate（非 CrudPage），记录其 props 以便后续直接驱动
// props.crud.api（createListPageCrudApi 产出的 CrudOperations）做真断言。
vi.mock('@/components/templates/ListPageTemplate', () => {
  const MockListPage = (props: Record<string, unknown>) => {
    mockListPage(props);
    return <div data-testid='list-page-template'>list-page-template</div>;
  };
  return { default: MockListPage, ListPageTemplate: MockListPage };
});

vi.mock('@/components/templates/list/SchemaForm', () => ({
  SchemaForm: () => null,
}));

vi.mock('@/schemas/wms/warehouse', () => ({
  warehouseSchema: { name: 'warehouseSchema' },
}));

vi.mock('@/module-configs/wms/config', () => ({
  WMS_PATHS: { root: '/wms' },
}));

vi.mock('@/api/wms', () => ({
  wmsApi: {
    warehouses: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'wh-1',
              code: 'WH-01',
              name: 'Main Warehouse',
              status: 'active',
            },
          ],
          total: 1,
        },
      }),
      get: vi.fn(),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wh-9', code: 'WH-09', name: 'New Warehouse', status: 'active' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wh-1', code: 'WH-01', name: 'Renamed Warehouse', status: 'active' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('WarehouseManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through ListPageTemplate with warehouse breadcrumbs and query key', () => {
    render(<WarehouseManagementPage />);

    expect(screen.getByTestId('list-page-template')).toBeInTheDocument();
    expect(mockListPage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '仓库管理',
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: '仓储管理', href: '/wms' },
          { label: '仓库管理' },
        ],
        crud: expect.objectContaining({
          queryKey: 'wms-warehouses',
          entityName: '仓库管理',
        }),
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unwraps paginated response', async () => {
    render(<WarehouseManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    const result = await props.crud.api.list({ page: 2, pageSize: 20, search: 'WH-01' });

    expect(wmsApi.warehouses.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'WH-01',
    });
    expect(result.data).toEqual({
      items: [
        {
          id: 'wh-1',
          code: 'WH-01',
          name: 'Main Warehouse',
          status: 'active',
        },
      ],
      total: 1,
    });
  });

  it('delegates create, update and delete and unwraps returned data', async () => {
    render(<WarehouseManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    const created = await props.crud.api.create({ name: 'New Warehouse' });
    expect(wmsApi.warehouses.create).toHaveBeenCalledWith({ name: 'New Warehouse' });
    expect(created.data).toEqual({
      id: 'wh-9',
      code: 'WH-09',
      name: 'New Warehouse',
      status: 'active',
    });

    const updated = await props.crud.api.update('wh-1', { name: 'Renamed Warehouse' });
    expect(wmsApi.warehouses.update).toHaveBeenCalledWith('wh-1', {
      name: 'Renamed Warehouse',
    });
    expect(updated.data).toEqual({
      id: 'wh-1',
      code: 'WH-01',
      name: 'Renamed Warehouse',
      status: 'active',
    });

    const removed = await props.crud.api.delete('wh-1');
    expect(wmsApi.warehouses.delete).toHaveBeenCalledWith('wh-1');
    expect(removed).toMatchObject({ success: true, code: 200, data: 'wh-1' });
  });

  it('rejects with translated errors when warehouse API operations fail', async () => {
    vi.mocked(wmsApi.warehouses.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(wmsApi.warehouses.create).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.warehouses.update).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.warehouses.delete).mockResolvedValueOnce({ success: false });

    render(<WarehouseManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await expect(props.crud.api.list({})).rejects.toThrow('加载列表失败');
    await expect(props.crud.api.create({})).rejects.toThrow('创建失败');
    await expect(props.crud.api.update('wh-1', {})).rejects.toThrow('更新失败');
    await expect(props.crud.api.delete('wh-1')).rejects.toThrow('删除失败');
  });
});
