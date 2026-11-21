import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialReturnPage from '../mes/MaterialReturnPage';
import { mesApi } from '@/api/mes';

// MaterialReturnPage 在模块加载时即调用 createCrudPageAdapter(mesApi.materialReturns, { itemsField: 'returns' })，
// setup-mocks 将其 mock 为直通(api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/itemsField 响应解包/四档错误翻译。
vi.unmock('@/schema-dsl/crudPageAdapter');

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
  materialReturnSchema: { name: 'materialReturnSchema' },
}));

vi.mock('@/api/mes', () => ({
  mesApi: {
    materialReturns: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          returns: [
            { id: 'mr-1', return_no: 'RET-001', status: 'pending', operator: '张三' },
            { id: 'mr-2', return_no: 'RET-002', status: 'returned', operator: '李四' },
          ],
          total: 2,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mr-3', return_no: 'RET-003', status: 'pending' },
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mr-1', return_no: 'RET-001', status: 'pending', operator: '张三' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mr-1', return_no: 'RET-001', status: 'approved', operator: '张三' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MaterialReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with material return schema and MES breadcrumbs', () => {
    render(<MaterialReturnPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'materialReturnSchema' },
        breadcrumbs: [{ label: 'MES' }, expect.anything()],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unwraps itemsField=returns', async () => {
    render(<MaterialReturnPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 10, status: 'pending' });

    expect(mesApi.materialReturns.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      status: 'pending',
    });
    expect(result).toEqual({
      data: [
        { id: 'mr-1', return_no: 'RET-001', status: 'pending', operator: '张三' },
        { id: 'mr-2', return_no: 'RET-002', status: 'returned', operator: '李四' },
      ],
      total: 2,
    });
  });

  it('delegates create, update and delete with exact payloads', async () => {
    render(<MaterialReturnPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.create({
        order_id: 'wo-1',
        operator: '张三',
        items: [{ material_code: 'M-1', material_name: '钢材', quantity: 2 }],
      })
    ).resolves.toEqual({ id: 'mr-3', return_no: 'RET-003', status: 'pending' });
    await expect(
      props.apiAdapter.update('mr-1', { status: 'approved', reason: '检验合格' })
    ).resolves.toEqual({ id: 'mr-1', return_no: 'RET-001', status: 'approved', operator: '张三' });
    await expect(props.apiAdapter.delete('mr-1')).resolves.toBeUndefined();

    expect(mesApi.materialReturns.create).toHaveBeenCalledWith({
      order_id: 'wo-1',
      operator: '张三',
      items: [{ material_code: 'M-1', material_name: '钢材', quantity: 2 }],
    });
    expect(mesApi.materialReturns.update).toHaveBeenCalledWith('mr-1', {
      status: 'approved',
      reason: '检验合格',
    });
    expect(mesApi.materialReturns.delete).toHaveBeenCalledWith('mr-1');
  });

  it('throws translated errors when material return API operations fail', async () => {
    render(<MaterialReturnPage />);
    const props = mockCrudPage.mock.calls[0][0];

    mesApi.materialReturns.list.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');

    mesApi.materialReturns.create.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.create({} as never)).rejects.toThrow('创建失败');

    mesApi.materialReturns.update.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.update('mr-1', {} as never)).rejects.toThrow('更新失败');

    mesApi.materialReturns.delete.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.delete('mr-1')).rejects.toThrow('删除失败');
  });

  it('computes header stats from status buckets of the loaded rows', () => {
    render(<MaterialReturnPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const rows = [
      { status: 'pending' },
      { status: 'approved' },
      { status: 'returned' },
      { status: 'pending' },
    ];
    const { container } = render(
      (props.headerContent as (rows: unknown[]) => React.ReactNode)(rows) as React.ReactElement
    );

    // 4 张统计卡片：pending=2 / approved=1 / returned=1 / total=4
    const numbers = Array.from(container.querySelectorAll('h5')).map((el) =>
      Number((el as HTMLElement).textContent)
    );
    expect(numbers).toEqual([2, 1, 1, 4]);
  });
});
