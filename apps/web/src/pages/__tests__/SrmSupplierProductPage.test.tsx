import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SrmSupplierProductPage from '../srm/SrmSupplierProductPage';
import { srmApi } from '@/api/srm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页适配器为页面内手写实现（内存 store，非 createCrudPageAdapter 生成），照范本恢复真实适配器。
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
        'pages.srm_supplier_product_page.k32': '产品不存在',
        'pages.srm_supplier_product_page.k37': '供应商产品',
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

vi.mock('@/schemas/srm', () => ({
  supplierProductSchema: { name: 'supplierProductSchema' },
}));

vi.mock('@/api/srm', () => ({
  srmApi: {
    listProducts: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('SrmSupplierProductPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with product schema and breadcrumbs, and calls listProducts', async () => {
    render(<SrmSupplierProductPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'supplierProductSchema' },
        breadcrumbs: [{ label: 'SRM' }, { label: '供应商产品' }],
      })
    );
    await waitFor(() => expect(srmApi.listProducts).toHaveBeenCalled());
  });

  it('filters and paginates the in-memory product store', async () => {
    render(<SrmSupplierProductPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const all = await props.apiAdapter.list({ page: 0, pageSize: 10 });
    expect(all.total).toBe(8);
    expect(all.data).toHaveLength(8);

    const searched = await props.apiAdapter.list({ page: 0, pageSize: 10, search: 'sp-001' });
    expect(searched.total).toBe(1);
    expect(searched.data[0].product_code).toBe('SP-001');

    const paged = await props.apiAdapter.list({ page: 1, pageSize: 3 });
    expect(paged.total).toBe(8);
    expect(paged.data).toHaveLength(3);
  });

  it('updates an existing product and throws when the product does not exist', async () => {
    render(<SrmSupplierProductPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const updated = await props.apiAdapter.update('1', { name: 'Renamed Product' });
    expect(updated.id).toBe('1');
    expect(updated.name).toBe('Renamed Product');

    await expect(props.apiAdapter.update('no-such-product', { name: 'x' })).rejects.toThrow(
      '产品不存在'
    );
  });

  it('creates a new product and prepends it to the store', async () => {
    render(<SrmSupplierProductPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const before = await props.apiAdapter.list({ page: 0, pageSize: 100 });
    const created = await props.apiAdapter.create({
      product_code: 'SP-100',
      name: 'New Product',
      supplier: 'New Supplier',
      price: 99,
    });
    expect(created.product_code).toBe('SP-100');
    expect(created.status).toBe('active');

    const after = await props.apiAdapter.list({ page: 0, pageSize: 100 });
    expect(after.total).toBe(before.total + 1);
    expect(after.data[0].product_code).toBe('SP-100');
  });

  it('deletes a product from the store', async () => {
    render(<SrmSupplierProductPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const before = await props.apiAdapter.list({ page: 0, pageSize: 100 });
    await props.apiAdapter.delete('2');
    const after = await props.apiAdapter.list({ page: 0, pageSize: 100 });
    expect(after.total).toBe(before.total - 1);
    expect(after.data.find((p) => p.id === '2')).toBeUndefined();
  });
});
