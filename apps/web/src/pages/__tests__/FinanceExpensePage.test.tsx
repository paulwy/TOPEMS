import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinanceExpensePage from '../finance/FinanceExpensePage';
import { financeApi } from '@/api/finance';

// CrudPage 模板页：setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 本 spec 验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter 翻译，
// 避免测试环境 i18n 资源未就绪导致 t() 返回原始 key（与 locales/zh/schema.json 一致）
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

vi.mock('@/schemas/finance', () => ({
  expenseSchema: { name: 'expenseSchema' },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    account: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'acc-1', name: '差旅费' }], total: 1 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'acc-2', name: '市场费用' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'acc-1', name: '差旅费-改' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('FinanceExpensePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders expense management through CrudPage with finance breadcrumbs', () => {
    render(<FinanceExpensePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'expenseSchema' },
        breadcrumbs: [
          { label: 'finance.finance_expense_page.k1' },
          { label: 'finance.finance_expense_page.k0' },
        ],
      })
    );
  });

  it('maps list params pageSize to page_size and unpacks items/total', async () => {
    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: '差旅',
      status: 'active',
    });

    expect(financeApi.account.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: '差旅',
      status: 'active',
    });
    expect(result).toEqual({
      data: [{ id: 'acc-1', name: '差旅费' }],
      total: 1,
    });
  });

  it('delegates create, update and delete to account API', async () => {
    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '市场费用' })).resolves.toEqual({
      id: 'acc-2',
      name: '市场费用',
    });
    await expect(props.apiAdapter.update('acc-1', { name: '差旅费-改' })).resolves.toEqual({
      id: 'acc-1',
      name: '差旅费-改',
    });
    await expect(props.apiAdapter.delete('acc-1')).resolves.toBeUndefined();

    expect(financeApi.account.create).toHaveBeenCalledWith({ name: '市场费用' });
    expect(financeApi.account.update).toHaveBeenCalledWith('acc-1', { name: '差旅费-改' });
    expect(financeApi.account.delete).toHaveBeenCalledWith('acc-1');
  });

  it('throws translated errors when account API operations fail', async () => {
    vi.mocked(financeApi.account.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(financeApi.account.create).mockResolvedValueOnce({ success: false });
    vi.mocked(financeApi.account.update).mockResolvedValueOnce({ success: false });
    vi.mocked(financeApi.account.delete).mockResolvedValueOnce({ success: false });

    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('acc-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('acc-1')).rejects.toThrow('删除失败');
  });
});
