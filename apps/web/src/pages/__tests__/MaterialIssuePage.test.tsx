import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialIssuePage from '../mes/MaterialIssuePage';
import { mesApi } from '@/api/mes';

// MaterialIssuePage 在模块加载时即调用 createCrudPageAdapter(mesApi.materialIssues, { itemsField: 'issues' })，
// setup-mocks 将其 mock 为直通(api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/itemsField 响应解包/四档错误翻译。
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
  materialIssueSchema: { name: 'materialIssueSchema' },
}));

vi.mock('@/api/mes', () => ({
  mesApi: {
    materialIssues: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          issues: [
            { id: 'mi-1', issue_no: 'ISSUE-001', status: 'pending', operator: '张三' },
            { id: 'mi-2', issue_no: 'ISSUE-002', status: 'approved', operator: '李四' },
          ],
          total: 2,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mi-3', issue_no: 'ISSUE-003', status: 'pending' },
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mi-1', issue_no: 'ISSUE-001', status: 'pending', operator: '张三' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'mi-1', issue_no: 'ISSUE-001', status: 'issued', operator: '张三' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MaterialIssuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with material issue schema and MES breadcrumbs', () => {
    render(<MaterialIssuePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'materialIssueSchema' },
        breadcrumbs: [{ label: 'MES' }, expect.anything()],
        detailMaxWidth: 'lg',
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unwraps itemsField=issues', async () => {
    render(<MaterialIssuePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: 'ISSUE' });

    expect(mesApi.materialIssues.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'ISSUE',
    });
    expect(result).toEqual({
      data: [
        { id: 'mi-1', issue_no: 'ISSUE-001', status: 'pending', operator: '张三' },
        { id: 'mi-2', issue_no: 'ISSUE-002', status: 'approved', operator: '李四' },
      ],
      total: 2,
    });
  });

  it('delegates create, update and delete with exact payloads', async () => {
    render(<MaterialIssuePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.create({
        order_id: 'wo-1',
        operator: '张三',
        items: [{ material_code: 'M-1', material_name: '钢材', quantity: 5 }],
      })
    ).resolves.toEqual({ id: 'mi-3', issue_no: 'ISSUE-003', status: 'pending' });
    await expect(
      props.apiAdapter.update('mi-1', { status: 'issued', remark: '已发料' })
    ).resolves.toEqual({ id: 'mi-1', issue_no: 'ISSUE-001', status: 'issued', operator: '张三' });
    await expect(props.apiAdapter.delete('mi-1')).resolves.toBeUndefined();

    expect(mesApi.materialIssues.create).toHaveBeenCalledWith({
      order_id: 'wo-1',
      operator: '张三',
      items: [{ material_code: 'M-1', material_name: '钢材', quantity: 5 }],
    });
    expect(mesApi.materialIssues.update).toHaveBeenCalledWith('mi-1', {
      status: 'issued',
      remark: '已发料',
    });
    expect(mesApi.materialIssues.delete).toHaveBeenCalledWith('mi-1');
  });

  it('throws translated errors when material issue API operations fail', async () => {
    render(<MaterialIssuePage />);
    const props = mockCrudPage.mock.calls[0][0];

    mesApi.materialIssues.list.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');

    mesApi.materialIssues.create.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.create({} as never)).rejects.toThrow('创建失败');

    mesApi.materialIssues.update.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.update('mi-1', {} as never)).rejects.toThrow('更新失败');

    mesApi.materialIssues.delete.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.delete('mi-1')).rejects.toThrow('删除失败');
  });

  it('computes header stats from status buckets of the loaded rows', () => {
    render(<MaterialIssuePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const rows = [
      { status: 'pending' },
      { status: 'approved' },
      { status: 'issued' },
      { status: 'pending' },
    ];
    const { container } = render(
      (props.headerContent as (rows: unknown[]) => React.ReactNode)(rows) as React.ReactElement
    );

    // 4 张统计卡片：pending=2 / approved=1 / issued=1 / total=4
    const numbers = Array.from(container.querySelectorAll('h5')).map((el) =>
      Number((el as HTMLElement).textContent)
    );
    expect(numbers).toEqual([2, 1, 1, 4]);
  });
});
