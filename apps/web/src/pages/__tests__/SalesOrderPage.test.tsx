import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SalesOrderPage from '../erp/SalesOrderPage';
import { erpApi } from '@/api/erp';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本文件验证真实适配器（含 itemsField:'orders' 响应解包），需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'erp.sales_order_page.k4': '首页',
        'erp.sales_order_page.k5': '销售订单',
      };
      return translations[key] ?? key;
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

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/erp/salesOrder', () => ({
  salesOrderSchema: { name: 'salesOrderSchema' },
}));

vi.mock('@/api/erp', () => ({
  erpApi: {
    salesOrders: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          orders: [
            { id: 'so-1', order_number: 'SO-001', status: 'draft', total_amount: 1000 },
            { id: 'so-2', order_number: 'SO-002', status: 'approved', total_amount: 2500 },
          ],
          total: 2,
          page: 1,
          page_size: 10,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'so-9', order_number: 'SO-009', status: 'draft' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'so-1', order_number: 'SO-001', status: 'approved' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('SalesOrderPage（批次5）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with salesOrderSchema and ERP breadcrumbs', () => {
    render(<SalesOrderPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'salesOrderSchema' },
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: 'ERP', href: '/erp' },
          { label: '销售订单' },
        ],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unwraps orders-shaped response', async () => {
    render(<SalesOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'SO-001',
      status: 'approved',
    });

    // 适配器 pageSize 归一化为 page_size 后透传；其余参数原样透传
    expect(erpApi.salesOrders.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'SO-001',
      status: 'approved',
    });
    // itemsField:'orders' → data.orders 解包为列表
    expect(result).toEqual({
      data: [
        { id: 'so-1', order_number: 'SO-001', status: 'draft', total_amount: 1000 },
        { id: 'so-2', order_number: 'SO-002', status: 'approved', total_amount: 2500 },
      ],
      total: 2,
    });
  });

  it('delegates create, update and delete operations', async () => {
    render(<SalesOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ order_number: 'SO-009' })).resolves.toEqual({
      id: 'so-9',
      order_number: 'SO-009',
      status: 'draft',
    });
    await expect(props.apiAdapter.update('so-1', { status: 'approved' })).resolves.toEqual({
      id: 'so-1',
      order_number: 'SO-001',
      status: 'approved',
    });
    await expect(props.apiAdapter.delete('so-1')).resolves.toBeUndefined();

    expect(erpApi.salesOrders.create).toHaveBeenCalledWith({ order_number: 'SO-009' });
    expect(erpApi.salesOrders.update).toHaveBeenCalledWith('so-1', { status: 'approved' });
    expect(erpApi.salesOrders.delete).toHaveBeenCalledWith('so-1');
  });

  it('throws translated errors when sales-order API operations fail', async () => {
    vi.mocked(erpApi.salesOrders.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(erpApi.salesOrders.create).mockResolvedValueOnce({ success: false });
    vi.mocked(erpApi.salesOrders.update).mockResolvedValueOnce({ success: false });
    vi.mocked(erpApi.salesOrders.delete).mockResolvedValueOnce({ success: false });

    render(<SalesOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('so-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('so-1')).rejects.toThrow('删除失败');
  });
});
