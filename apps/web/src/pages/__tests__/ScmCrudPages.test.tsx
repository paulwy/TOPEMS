import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScmPurchaseOrderPage from '../scm/ScmPurchaseOrderPage';
import ScmSupplierPage from '../scm/ScmSupplierPage';
import { scmApi } from '@/api/scm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表（与 locales/zh/schema.json 一致）。
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

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/scm', () => ({
  purchaseOrderSchema: { name: 'purchaseOrderSchema' },
  supplierSchema: { name: 'supplierSchema' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    purchaseOrders: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            { id: 'po-1', order_no: 'PO-001', status: 'draft' },
            { id: 'po-2', order_no: 'PO-002', status: 'approved' },
          ],
          total: 2,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'po-9', order_no: 'PO-009', status: 'draft' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'po-1', order_no: 'PO-001', status: 'approved' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
    suppliers: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'sup-1', name: '供应商甲', status: 'active' }], total: 1 },
      }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('ScmCrudPages（批次4）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders purchase order page through CrudPage with SCM breadcrumbs', () => {
    render(<ScmPurchaseOrderPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'purchaseOrderSchema' },
        breadcrumbs: [{ label: 'SCM' }, { label: 'scm.purchase_order.k7' }],
      })
    );
  });

  it('normalizes purchase-order list params (pageSize→page_size) and unwraps response', async () => {
    render(<ScmPurchaseOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'PO-001',
      status: 'approved',
    });

    expect(scmApi.purchaseOrders.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'PO-001',
      status: 'approved',
    });
    expect(result).toEqual({
      data: [
        { id: 'po-1', order_no: 'PO-001', status: 'draft' },
        { id: 'po-2', order_no: 'PO-002', status: 'approved' },
      ],
      total: 2,
    });
  });

  it('delegates purchase-order create, update and delete operations', async () => {
    render(<ScmPurchaseOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ order_no: 'PO-009' })).resolves.toEqual({
      id: 'po-9',
      order_no: 'PO-009',
      status: 'draft',
    });
    await expect(props.apiAdapter.update('po-1', { status: 'approved' })).resolves.toEqual({
      id: 'po-1',
      order_no: 'PO-001',
      status: 'approved',
    });
    await expect(props.apiAdapter.delete('po-1')).resolves.toBeUndefined();

    expect(scmApi.purchaseOrders.create).toHaveBeenCalledWith({ order_no: 'PO-009' });
    expect(scmApi.purchaseOrders.update).toHaveBeenCalledWith('po-1', { status: 'approved' });
    expect(scmApi.purchaseOrders.delete).toHaveBeenCalledWith('po-1');
  });

  it('throws translated errors when purchase-order API operations fail', async () => {
    vi.mocked(scmApi.purchaseOrders.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(scmApi.purchaseOrders.create).mockResolvedValueOnce({ success: false });
    vi.mocked(scmApi.purchaseOrders.update).mockResolvedValueOnce({ success: false });
    vi.mocked(scmApi.purchaseOrders.delete).mockResolvedValueOnce({ success: false });

    render(<ScmPurchaseOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('po-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('po-1')).rejects.toThrow('删除失败');
  });

  it('renders supplier page with supplier schema and SCM breadcrumbs', () => {
    render(<ScmSupplierPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'supplierSchema' },
        breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_supplier_page.k0' }],
      })
    );
  });

  it('normalizes supplier list params and unwraps supplier response', async () => {
    render(<ScmSupplierPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ pageSize: 10, search: '甲' });

    expect(scmApi.suppliers.list).toHaveBeenCalledWith({ page_size: 10, search: '甲' });
    expect(result).toEqual({
      data: [{ id: 'sup-1', name: '供应商甲', status: 'active' }],
      total: 1,
    });
  });
});
