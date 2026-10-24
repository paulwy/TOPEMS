import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InboundOrderPage from '../wms/InboundOrderPage';
import { wmsApi } from '@/api/wms';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通 (api)=>api；
// 本页在模块加载时即调用 createCrudPageAdapter(wmsApi.inboundOrders, { itemsField: 'orders' })
// 构造真实适配器，这里恢复真实实现以验证参数归一化/响应解包(orders 字段)/错误翻译。
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
        'pages.inbound_order_page.k0': '首页',
        'pages.inbound_order_page.k1': '仓储管理',
        'pages.inbound_order_page.k2': '入库订单',
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

vi.mock('@/schemas/wms/inboundOrder', () => ({
  inboundOrderSchema: { name: 'inboundOrderSchema' },
}));

vi.mock('@/modules/wms/config', () => ({
  WMS_PATHS: { root: '/wms' },
}));

vi.mock('@/api/wms', () => ({
  wmsApi: {
    inboundOrders: {
      // 后端 GET /inbound-orders 实际返回 data.orders（见页面源码注释），
      // 此处不放 data.items，以证明 itemsField: 'orders' 配置生效。
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          orders: [
            {
              id: 'io-1',
              order_number: 'IN-202609001',
              supplier_name: 'Supplier A',
              status: 'pending',
            },
          ],
          total: 1,
        },
      }),
      get: vi.fn(),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'io-9', order_number: 'IN-202609009', status: 'pending' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'io-1', order_number: 'IN-202609001', status: 'received' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('InboundOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through ListPageTemplate with inbound order breadcrumbs and query key', () => {
    render(<InboundOrderPage />);

    expect(screen.getByTestId('list-page-template')).toBeInTheDocument();
    expect(mockListPage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '入库订单',
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: '仓储管理', href: '/wms' },
          { label: '入库订单' },
        ],
        crud: expect.objectContaining({
          queryKey: 'wms-inbound-orders',
          entityName: '入库订单',
        }),
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unpacks rows from data.orders', async () => {
    render(<InboundOrderPage />);
    const props = mockListPage.mock.calls[0][0];

    const result = await props.crud.api.list({ page: 2, pageSize: 20, search: 'IN-2026' });

    expect(wmsApi.inboundOrders.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'IN-2026',
    });
    expect(result.data).toEqual({
      items: [
        {
          id: 'io-1',
          order_number: 'IN-202609001',
          supplier_name: 'Supplier A',
          status: 'pending',
        },
      ],
      total: 1,
    });
  });

  it('delegates create, update and delete and unwraps returned order', async () => {
    render(<InboundOrderPage />);
    const props = mockListPage.mock.calls[0][0];

    const created = await props.crud.api.create({ order_number: 'IN-202609009' });
    expect(wmsApi.inboundOrders.create).toHaveBeenCalledWith({ order_number: 'IN-202609009' });
    expect(created.data).toEqual({
      id: 'io-9',
      order_number: 'IN-202609009',
      status: 'pending',
    });

    const updated = await props.crud.api.update('io-1', { status: 'received' });
    expect(wmsApi.inboundOrders.update).toHaveBeenCalledWith('io-1', { status: 'received' });
    expect(updated.data).toEqual({
      id: 'io-1',
      order_number: 'IN-202609001',
      status: 'received',
    });

    const removed = await props.crud.api.delete('io-1');
    expect(wmsApi.inboundOrders.delete).toHaveBeenCalledWith('io-1');
    expect(removed).toMatchObject({ success: true, code: 200, data: 'io-1' });
  });

  it('rejects with translated errors when inbound order API operations fail', async () => {
    vi.mocked(wmsApi.inboundOrders.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(wmsApi.inboundOrders.create).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.inboundOrders.update).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.inboundOrders.delete).mockResolvedValueOnce({ success: false });

    render(<InboundOrderPage />);
    const props = mockListPage.mock.calls[0][0];

    await expect(props.crud.api.list({})).rejects.toThrow('加载列表失败');
    await expect(props.crud.api.create({})).rejects.toThrow('创建失败');
    await expect(props.crud.api.update('io-1', {})).rejects.toThrow('更新失败');
    await expect(props.crud.api.delete('io-1')).rejects.toThrow('删除失败');
  });
});
