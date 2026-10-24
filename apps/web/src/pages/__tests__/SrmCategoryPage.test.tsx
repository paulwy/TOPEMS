import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SrmCategoryPage from '../srm/SrmCategoryPage';
import { supplierCategoryApi } from '@/api/srm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页适配器为页面内手写实现（非 createCrudPageAdapter 生成），照范本恢复真实适配器。
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
        'pages.srm_category_page.k21': '供应商分类',
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
  categorySchema: { name: 'categorySchema' },
}));

vi.mock('@/api/srm', () => ({
  supplierCategoryApi: {
    listCategories: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'cat-1',
            code: 'CAT-01',
            name: 'Raw Materials',
            description: 'd1',
            level: 1,
            sort_order: 0,
            is_active: true,
            created_at: '2025-01-01',
            updated_at: '2025-06-01',
          },
          {
            id: 'cat-2',
            code: 'CAT-02',
            name: 'Parts',
            description: 'd2',
            level: 2,
            sort_order: 1,
            is_active: false,
            created_at: '2025-01-02',
            updated_at: '2025-06-02',
          },
        ],
        total: 2,
        page: 1,
        page_size: 10,
        pageSize: 10,
        total_pages: 1,
        totalPages: 1,
      },
    }),
    createCategory: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'cat-9',
        code: 'CAT-99',
        name: 'New Category',
        description: 'd9',
        level: 1,
        sort_order: 0,
        is_active: true,
        created_at: '2025-06-01',
        updated_at: '2025-06-01',
      },
    }),
    updateCategory: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'cat-1',
        code: 'CAT-01',
        name: 'Renamed Category',
        description: 'd1',
        level: 1,
        sort_order: 0,
        is_active: false,
        created_at: '2025-01-01',
        updated_at: '2025-06-01',
      },
    }),
    deleteCategory: vi.fn().mockResolvedValue({ success: true, data: true }),
  },
}));

describe('SrmCategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with category schema and SRM breadcrumbs', () => {
    render(<SrmCategoryPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'categorySchema' },
        breadcrumbs: [{ label: 'SRM' }, { label: '供应商分类' }],
      })
    );
  });

  it('normalizes list params (page+1, page_size) and maps API rows to page model', async () => {
    render(<SrmCategoryPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 20, search: 'raw' });

    expect(supplierCategoryApi.listCategories).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'raw',
    });
    expect(result.total).toBe(2);
    expect(result.data[0]).toMatchObject({
      id: 'cat-1',
      code: 'CAT-01',
      name: 'Raw Materials',
      status: 'active',
      level: 1,
      supplier_count: 0,
    });
    expect(result.data[1]).toMatchObject({
      id: 'cat-2',
      code: 'CAT-02',
      name: 'Parts',
      status: 'inactive',
      level: 2,
    });
  });

  it('creates a category with mapped payload and unwraps the created row', async () => {
    render(<SrmCategoryPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.create({
        code: 'CAT-99',
        name: 'New Category',
        description: 'd9',
        level: 1,
        status: 'active',
      })
    ).resolves.toMatchObject({
      id: 'cat-9',
      code: 'CAT-99',
      name: 'New Category',
      status: 'active',
    });
    expect(supplierCategoryApi.createCategory).toHaveBeenCalledWith({
      category_no: 'CAT-99',
      name: 'New Category',
      description: 'd9',
      level: 1,
      is_active: true,
    });
  });

  it('updates a category with partial mapped payload and unwraps the updated row', async () => {
    render(<SrmCategoryPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.update('cat-1', { name: 'Renamed Category', status: 'inactive' })
    ).resolves.toMatchObject({
      id: 'cat-1',
      name: 'Renamed Category',
      status: 'inactive',
    });
    expect(supplierCategoryApi.updateCategory).toHaveBeenCalledWith('cat-1', {
      category_no: undefined,
      name: 'Renamed Category',
      description: undefined,
      level: undefined,
      is_active: false,
    });
  });

  it('delegates category delete to supplierCategoryApi', async () => {
    render(<SrmCategoryPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.delete('cat-1')).resolves.toBeUndefined();
    expect(supplierCategoryApi.deleteCategory).toHaveBeenCalledWith('cat-1');
  });
});
