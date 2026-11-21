import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialRequirementPage from '../mes/MaterialRequirementPage';
import { mesApi } from '@/api/mes';

// MaterialRequirementPage 在模块加载时即调用
// createCrudPageAdapter(mesApi.materialRequirements, { itemsField: 'requirements' })，
// setup-mocks 将其 mock 为直通(api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/itemsField 响应解包/错误翻译。
vi.unmock('@/schema-dsl/crudPageAdapter');

// 真实适配器直接用全局 i18n.t（非 react-i18next hook），显式提供 crud_page_adapter
// 翻译表（与 locales/zh/schema.json 一致），避免 t() 返回原始 key。
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

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/mes', () => ({
  materialRequirementSchema: { name: 'materialRequirementSchema' },
}));

vi.mock('@/api/mes', () => ({
  mesApi: {
    materialRequirements: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          requirements: [{ id: 'mr-1', mrp_no: 'MRP-001', status: 'draft' }],
          total: 1,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mr-2', mrp_no: 'MRP-002', status: 'draft' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mr-1', mrp_no: 'MRP-001', status: 'confirmed' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MaterialRequirementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with material requirement schema and MES breadcrumbs', () => {
    render(<MaterialRequirementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'materialRequirementSchema' },
        breadcrumbs: [{ label: 'MES' }, { label: 'mes.material_requirement_page.k18' }],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unpacks requirements response', async () => {
    render(<MaterialRequirementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 10, search: 'MRP' });

    expect(mesApi.materialRequirements.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      search: 'MRP',
    });
    expect(result).toEqual({
      data: [{ id: 'mr-1', mrp_no: 'MRP-001', status: 'draft' }],
      total: 1,
    });
  });

  it('delegates create, update and delete with payload and unpacks returned data', async () => {
    render(<MaterialRequirementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ mrp_no: 'MRP-002' })).resolves.toEqual({
      id: 'mr-2',
      mrp_no: 'MRP-002',
      status: 'draft',
    });
    await expect(props.apiAdapter.update('mr-1', { status: 'confirmed' })).resolves.toEqual({
      id: 'mr-1',
      mrp_no: 'MRP-001',
      status: 'confirmed',
    });
    await expect(props.apiAdapter.delete('mr-1')).resolves.toBeUndefined();

    expect(mesApi.materialRequirements.create).toHaveBeenCalledWith({ mrp_no: 'MRP-002' });
    expect(mesApi.materialRequirements.update).toHaveBeenCalledWith('mr-1', {
      status: 'confirmed',
    });
    expect(mesApi.materialRequirements.delete).toHaveBeenCalledWith('mr-1');
  });

  it('throws translated errors when material requirement API operations fail', async () => {
    vi.mocked(mesApi.materialRequirements.list).mockResolvedValueOnce({
      success: false,
      data: null,
    });
    vi.mocked(mesApi.materialRequirements.create).mockResolvedValueOnce({ success: false });
    vi.mocked(mesApi.materialRequirements.update).mockResolvedValueOnce({ success: false });
    vi.mocked(mesApi.materialRequirements.delete).mockResolvedValueOnce({ success: false });

    render(<MaterialRequirementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('mr-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('mr-1')).rejects.toThrow('删除失败');
  });
});
