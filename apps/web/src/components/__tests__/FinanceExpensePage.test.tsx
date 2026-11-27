import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinanceExpensePage from '../finance/FinanceExpensePage';
import { financeApi } from '@/api/finance';

// CrudPage 模板页：setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 本 spec 验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema-dsl/crudPageAdapter');

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
    expense: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'exp-1', title: '差旅费' }], total: 1 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'exp-2', title: '市场费用' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'exp-1', title: '差旅费-改' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      pay: vi.fn().mockResolvedValue({ success: true }),
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

    expect(financeApi.expense.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: '差旅',
      status: 'active',
    });
    expect(result).toEqual({
      data: [{ id: 'exp-1', title: '差旅费' }],
      total: 1,
    });
  });

  it('delegates create, update and delete to expense API', async () => {
    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ title: '市场费用' })).resolves.toEqual({
      id: 'exp-2',
      title: '市场费用',
    });
    await expect(props.apiAdapter.update('exp-1', { title: '差旅费-改' })).resolves.toEqual({
      id: 'exp-1',
      title: '差旅费-改',
    });
    await expect(props.apiAdapter.delete('exp-1')).resolves.toBeUndefined();

    expect(financeApi.expense.create).toHaveBeenCalledWith({ title: '市场费用' });
    expect(financeApi.expense.update).toHaveBeenCalledWith('exp-1', { title: '差旅费-改' });
    expect(financeApi.expense.delete).toHaveBeenCalledWith('exp-1');
  });

  it('throws translated errors when expense API operations fail', async () => {
    vi.mocked(financeApi.expense.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(financeApi.expense.create).mockResolvedValueOnce({ success: false });
    vi.mocked(financeApi.expense.update).mockResolvedValueOnce({ success: false });
    vi.mocked(financeApi.expense.delete).mockResolvedValueOnce({ success: false });

    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('exp-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('exp-1')).rejects.toThrow('删除失败');
  });

  it('exposes 支付 row action only for approved expenses and calls pay API', async () => {
    render(<FinanceExpensePage />);
    const props = mockCrudPage.mock.calls[0][0];
    const payAction = (props.customRowActions as Array<Record<string, unknown>>).find(
      (a) => a.key === 'pay'
    );
    expect(payAction).toBeTruthy();
    const show = payAction?.show as (row: Record<string, unknown>) => boolean;
    expect(show({ status: 'approved' })).toBe(true);
    expect(show({ status: 'paid' })).toBe(false);
    expect(show({ status: 'submitted' })).toBe(false);
    expect(payAction?.confirm).toBe(true);

    (payAction?.onClick as (row: Record<string, unknown>) => void)({
      id: 'exp-1',
      status: 'approved',
    });
    await vi.waitFor(() => {
      expect(financeApi.expense.pay).toHaveBeenCalledWith('exp-1');
    });
  });
});
