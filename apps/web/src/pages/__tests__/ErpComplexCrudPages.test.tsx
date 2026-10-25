import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ReceivablePayablePage from '../erp/ReceivablePayablePage';
import BudgetManagementPage from '../erp/BudgetManagementPage';
import { receivableApi, payableApi, budgetApi, expenseApi } from '@/api/finance';

// 批次7：erp 域复杂 CrudPage 页补测（ReceivablePayable / BudgetManagement）。
// 两页均为 Tabs + CrudPage + headerContent(函数形态统计卡)。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    const headerContent = props.headerContent as
      React.ReactNode | ((rows: unknown[], total: number) => React.ReactNode);
    let header: React.ReactNode = null;
    if (typeof headerContent === 'function') {
      // 传入测试 rows + total 触发统计卡渲染
      header = headerContent(
        (props as { __testRows?: unknown[] }).__testRows ?? [],
        (props as { __testTotal?: number }).__testTotal ?? 0
      );
    } else if (headerContent) {
      header = headerContent;
    }
    return (
      <div data-testid='crud-page'>
        crud-page
        {header}
      </div>
    );
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/finance', () => ({
  receivableSchema: { name: 'receivableSchema' },
  payableSchema: { name: 'payableSchema' },
}));
vi.mock('@/schemas/erp', () => ({
  budgetSchema: { name: 'budgetSchema' },
  expenseSchema: { name: 'expenseSchema' },
}));

const makeEntityApi = vi.hoisted(() => (itemsKey = 'items') => ({
  list: vi.fn().mockResolvedValue({
    success: true,
    data: { [itemsKey]: [{ id: 'row-1' }], total: 1 },
  }),
  create: vi.fn().mockResolvedValue({ success: true, data: { id: 'row-2' } }),
  update: vi.fn().mockResolvedValue({ success: true, data: { id: 'row-1' } }),
  delete: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/finance', () => ({
  receivableApi: makeEntityApi(),
  payableApi: makeEntityApi(),
  budgetApi: makeEntityApi(),
  expenseApi: makeEntityApi(),
}));

// ─────────────────── ReceivablePayablePage ───────────────────
describe('ReceivablePayablePage（Tabs 应收/应付 + CrudPage + 统计卡函数）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认应收 tab：CrudPage 渲染 receivableSchema + 4 统计卡', () => {
    render(<ReceivablePayablePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
    expect(props.schema).toEqual({ name: 'receivableSchema' });
    expect(typeof props.headerContent).toBe('function');

    // 手动触发 headerContent 函数，断言 4 统计卡（用独立容器隔离首次 render 的空数据卡）
    const hc = props.headerContent as (
      rows: Array<{ amount?: number; status?: string }>,
      total: number
    ) => React.ReactNode;
    const { container: statsContainer } = render(
      <div>
        {hc(
          [
            { amount: 100, status: 'pending' },
            { amount: 200, status: 'overdue' },
            { amount: 50, status: 'paid' },
          ],
          3
        )}
      </div>
    );
    const stats = within(statsContainer);

    // 总数 3
    expect(stats.getByText('3')).toBeInTheDocument();
    // 应收总额 350.00
    expect(stats.getByText('350.00')).toBeInTheDocument();
    // 待收（pending）金额 100.00
    expect(stats.getByText('100.00')).toBeInTheDocument();
    // 逾期笔数 1
    expect(stats.getByText('1')).toBeInTheDocument();
  });

  it('切换到应付 tab：CrudPage 渲染 payableSchema', () => {
    render(<ReceivablePayablePage />);
    fireEvent.click(screen.getByText('erp.receivable_payable_page.k8'));

    const calls = mockCrudPage.mock.calls;
    const lastProps = calls[calls.length - 1][0] as Record<string, unknown>;
    expect(lastProps.schema).toEqual({ name: 'payableSchema' });
  });

  it('应收 adapter：list 归一化 pageSize→page_size + items 解包', async () => {
    render(<ReceivablePayablePage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: { list: (p: unknown) => Promise<{ data: unknown[]; total: number }> };
    };

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: '甲',
      status: 'pending',
    });
    expect(receivableApi.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: '甲',
      status: 'pending',
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('应收 adapter：create/update/delete 委托 + 错误翻译 k0/k1', async () => {
    render(<ReceivablePayablePage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: {
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    await expect(props.apiAdapter.create({ name: 'x' })).resolves.toEqual({ id: 'row-2' });
    await expect(props.apiAdapter.update('row-1', { name: 'y' })).resolves.toEqual({ id: 'row-1' });
    await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();
    expect(receivableApi.create).toHaveBeenCalledWith({ name: 'x' });

    receivableApi.create.mockResolvedValueOnce({ success: false });
    receivableApi.update.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.receivable_payable_page.k0');
    await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow(
      'erp.receivable_payable_page.k1'
    );
  });

  it('应付 adapter：list 解包 + create/update 错误翻译 k2/k3', async () => {
    render(<ReceivablePayablePage />);
    fireEvent.click(screen.getByText('erp.receivable_payable_page.k8'));
    const calls = mockCrudPage.mock.calls;
    const props = calls[calls.length - 1][0] as {
      apiAdapter: {
        list: (p: unknown) => Promise<{ data: unknown[]; total: number }>;
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    const result = await props.apiAdapter.list({ page: 1, pageSize: 10 });
    expect(payableApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    expect(result.data).toHaveLength(1);

    payableApi.create.mockResolvedValueOnce({ success: false });
    payableApi.update.mockResolvedValueOnce({ success: false });
    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.receivable_payable_page.k2');
    await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow(
      'erp.receivable_payable_page.k3'
    );
  });
});

// ─────────────────── BudgetManagementPage ───────────────────
describe('BudgetManagementPage（Tabs 预算/报销 + CrudPage + 统计卡）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认预算 tab：CrudPage 渲染 budgetSchema + 4 统计卡', () => {
    render(<BudgetManagementPage />);

    const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
    expect(props.schema).toEqual({ name: 'budgetSchema' });

    const hc = props.headerContent as (
      rows: Array<{ total_budget?: number; used_amount?: number }>,
      total: number
    ) => React.ReactNode;
    const { container: statsContainer } = render(
      <div>
        {hc(
          [
            { total_budget: 1000, used_amount: 500 },
            { total_budget: 2000, used_amount: 2500 },
          ],
          2
        )}
      </div>
    );
    const stats = within(statsContainer);

    // 预算总数 2
    expect(stats.getByText('2')).toBeInTheDocument();
    // 预算总额 + 已用均为 ¥3000.00（2 张卡）
    expect(stats.getAllByText('¥3000.00')).toHaveLength(2);
    // 超支笔数 1
    expect(stats.getByText('1')).toBeInTheDocument();
  });

  it('切换到报销 tab：CrudPage 渲染 expenseSchema + 报销统计卡', () => {
    render(<BudgetManagementPage />);
    fireEvent.click(screen.getByText('erp.budget_management_page.k15'));

    const calls = mockCrudPage.mock.calls;
    const props = calls[calls.length - 1][0] as Record<string, unknown>;
    expect(props.schema).toEqual({ name: 'expenseSchema' });

    const hc = props.headerContent as (
      rows: Array<{ amount?: number; status?: string }>,
      total: number
    ) => React.ReactNode;
    const { container: statsContainer } = render(
      <div>
        {hc(
          [
            { amount: 100, status: 'pending' },
            { amount: 200, status: 'completed' },
            { amount: 50, status: 'pending' },
          ],
          3
        )}
      </div>
    );
    const stats = within(statsContainer);

    // 报销总数 3
    expect(stats.getByText('3')).toBeInTheDocument();
    // 报销总额 ¥350.00
    expect(stats.getByText('¥350.00')).toBeInTheDocument();
    // 待审批 2
    expect(stats.getByText('2')).toBeInTheDocument();
    // 已完成 1
    expect(stats.getByText('1')).toBeInTheDocument();
  });

  it('预算 adapter：list 归一化（status=all 转 undefined）+ 解包', async () => {
    render(<BudgetManagementPage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: { list: (p: unknown) => Promise<{ data: unknown[]; total: number }> };
    };

    await props.apiAdapter.list({ page: 1, pageSize: 10, status: 'all' });
    expect(budgetApi.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      search: undefined,
      status: undefined,
    });

    await props.apiAdapter.list({ page: 1, pageSize: 10, status: 'active' });
    expect(budgetApi.list).toHaveBeenLastCalledWith({
      page: 1,
      page_size: 10,
      search: undefined,
      status: 'active',
    });
  });

  it('预算 adapter：create/update/delete 错误翻译 k0/k1/k2', async () => {
    render(<BudgetManagementPage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: {
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    budgetApi.create.mockResolvedValueOnce({ success: false });
    budgetApi.update.mockResolvedValueOnce({ success: false });
    budgetApi.delete.mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.budget_management_page.k0');
    await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow(
      'erp.budget_management_page.k1'
    );
    await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('erp.budget_management_page.k2');
  });

  it('报销 adapter：create/update/delete 错误翻译 k3/k4/k5', async () => {
    render(<BudgetManagementPage />);
    fireEvent.click(screen.getByText('erp.budget_management_page.k15'));
    const calls = mockCrudPage.mock.calls;
    const props = calls[calls.length - 1][0] as {
      apiAdapter: {
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    expenseApi.create.mockResolvedValueOnce({ success: false });
    expenseApi.update.mockResolvedValueOnce({ success: false });
    expenseApi.delete.mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.budget_management_page.k3');
    await expect(props.apiAdapter.update('row-1', {})).rejects.toThrow(
      'erp.budget_management_page.k4'
    );
    await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('erp.budget_management_page.k5');
  });
});
