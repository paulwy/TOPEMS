import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialPage from '../pdm/MaterialPage';
import { pdmApi } from '@/api/pdm';

// MaterialPage 使用 CrudPage 模板，但 apiAdapter 是页面内联手写（非 createCrudPageAdapter），
// 因此无需 unmock crudPageAdapter；直接 mock CrudPage 记录 props，再通过 props.apiAdapter
// 验证其 list 解包/客户端过滤、create/update/delete 的 payload 与错误分支。
const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/pdm', () => ({
  materialSchema: { name: 'materialSchema' },
}));

vi.mock('@/api/pdm', () => ({
  pdmApi: {
    listMaterials: vi.fn().mockResolvedValue({
      success: true,
      data: {
        materials: [
          {
            id: 'mat-1',
            name: 'steel-plate',
            code: 'M-001',
            supplier: 'steel-mill',
            category: 'raw',
            status: 'active',
            unit_price: 10,
            inventory_quantity: 100,
            safety_stock: 50,
          },
          {
            id: 'mat-2',
            name: 'aluminum-ingot',
            code: 'M-002',
            supplier: 'alu-mill',
            category: 'aux',
            status: 'active',
            unit_price: 20,
            inventory_quantity: 0,
            safety_stock: 5,
          },
        ],
      },
    }),
    createMaterial: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'mat-3', name: 'galvanized' },
    }),
    updateMaterial: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'mat-1', name: 'steel-plate-v2' },
    }),
    deleteMaterial: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('MaterialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with material schema and PDM breadcrumbs', () => {
    render(<MaterialPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'materialSchema' },
        breadcrumbs: [{ label: 'PDM' }, { label: 'pdm.material_page.k5' }],
      })
    );
  });

  it('fetches materials with no list params and unpacks the materials envelope', async () => {
    render(<MaterialPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({});

    expect(pdmApi.listMaterials).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(2);
    expect(result.data.map((m: { id: string }) => m.id)).toEqual(['mat-1', 'mat-2']);
  });

  it('filters materials client-side by search, category and derived stock status', async () => {
    render(<MaterialPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const bySearch = await props.apiAdapter.list({ search: 'steel' });
    expect(bySearch.data.map((m: { id: string }) => m.id)).toEqual(['mat-1']);

    const byCategory = await props.apiAdapter.list({ category: 'raw' });
    expect(byCategory.data.map((m: { id: string }) => m.id)).toEqual(['mat-1']);

    // mat-2 inventory_quantity=0 ≤ safety_stock 判定为 out_of_stock
    const byStatus = await props.apiAdapter.list({ status: 'out_of_stock' });
    expect(byStatus.data.map((m: { id: string }) => m.id)).toEqual(['mat-2']);
  });

  it('delegates create, update and delete and unpacks returned data', async () => {
    render(<MaterialPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: 'galvanized' })).resolves.toEqual({
      id: 'mat-3',
      name: 'galvanized',
    });
    await expect(props.apiAdapter.update('mat-1', { name: 'steel-plate-v2' })).resolves.toEqual({
      id: 'mat-1',
      name: 'steel-plate-v2',
    });
    await expect(props.apiAdapter.delete('mat-1')).resolves.toBeUndefined();

    expect(pdmApi.createMaterial).toHaveBeenCalledWith({ name: 'galvanized' });
    expect(pdmApi.updateMaterial).toHaveBeenCalledWith('mat-1', { name: 'steel-plate-v2' });
    expect(pdmApi.deleteMaterial).toHaveBeenCalledWith('mat-1');
  });

  it('returns empty list on list failure and rejects mutations with i18n fallback keys', async () => {
    vi.mocked(pdmApi.listMaterials).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(pdmApi.createMaterial).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.updateMaterial).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.deleteMaterial).mockResolvedValueOnce({ success: false });

    render(<MaterialPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).resolves.toEqual({ data: [], total: 0 });
    await expect(props.apiAdapter.create({})).rejects.toThrow('pdm.material_page.k0');
    await expect(props.apiAdapter.update('mat-1', {})).rejects.toThrow('pdm.material_page.k1');
    await expect(props.apiAdapter.delete('mat-1')).rejects.toThrow('pdm.material_page.k2');
  });
});
