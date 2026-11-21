import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountingManagementPage from '../erp/AccountingManagementPage';
import { accountingSubjectApi, openingBalanceApi } from '@/api/finance';
import { useNotificationStore } from '@/store';

// AccountingManagementPage：Tabs 会计科目/期初余额 + CrudPage + 期初余额结转 useMutation。
// useNotificationStore 为 selector 式调用（(s)=>s.addNotification）。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

const addNotificationMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({
  addNotification: addNotificationMock,
}));
vi.mock('@/store', () => ({
  useNotificationStore: (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    const headerContent = props.headerContent as React.ReactNode;
    return (
      <div data-testid='crud-page'>
        crud-page
        {headerContent}
      </div>
    );
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/finance', () => ({
  accountingSubjectSchema: { name: 'accountingSubjectSchema' },
  openingBalanceSchema: { name: 'openingBalanceSchema' },
}));

vi.mock('@/api/finance', () => ({
  accountingSubjectApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 's1' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 's2' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 's1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  openingBalanceApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'b1' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'b2' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 'b1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    carryForward: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('AccountingManagementPage（Tabs + CrudPage + 期初余额结转 mutation）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认会计科目 tab：CrudPage 渲染 accountingSubjectSchema + breadcrumbs', () => {
    render(<AccountingManagementPage />);
    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0] as Record<string, unknown>;
    expect(props.schema).toEqual({ name: 'accountingSubjectSchema' });
    expect(props.breadcrumbs).toEqual([
      { label: 'ERP' },
      { label: 'erp.accounting_management_page.k13' },
    ]);
  });

  it('切换到期初余额 tab：CrudPage 渲染 openingBalanceSchema + 结转按钮', () => {
    render(<AccountingManagementPage />);
    fireEvent.click(screen.getByText('erp.accounting_management_page.k12'));

    const calls = mockCrudPage.mock.calls;
    const props = calls[calls.length - 1][0] as Record<string, unknown>;
    expect(props.schema).toEqual({ name: 'openingBalanceSchema' });
    expect(props.breadcrumbs).toEqual([
      { label: 'ERP' },
      { label: 'erp.accounting_management_page.k14' },
    ]);
    // headerContent 渲染结转按钮
    expect(screen.getByText('erp.accounting_management_page.k10')).toBeInTheDocument();
  });

  it('点击结转按钮 → openingBalanceApi.carryForward + 成功通知 + invalidateQueries', async () => {
    render(<AccountingManagementPage />);
    fireEvent.click(screen.getByText('erp.accounting_management_page.k12'));

    fireEvent.click(screen.getByText('erp.accounting_management_page.k10'));

    await waitFor(() => {
      expect(openingBalanceApi.carryForward).toHaveBeenCalledTimes(1);
    });
    const args = vi.mocked(openingBalanceApi.carryForward).mock.calls[0][0] as {
      from_period: string;
      to_period: string;
    };
    expect(args.from_period).toMatch(/^\d{4}-\d{2}$/);
    expect(args.to_period).toMatch(/^\d{4}-\d{2}$/);
    expect(addNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('会计科目 adapter：list 归一化 pageSize→page_size + 解包', async () => {
    render(<AccountingManagementPage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: { list: (p: unknown) => Promise<{ data: unknown[]; total: number }> };
    };

    const result = await props.apiAdapter.list({
      page: 1,
      pageSize: 10,
      search: '现金',
      status: 'active',
    });
    expect(accountingSubjectApi.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      search: '现金',
      status: 'active',
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('会计科目 adapter：create/update/delete 错误翻译 k0/k1/k2', async () => {
    render(<AccountingManagementPage />);
    const props = mockCrudPage.mock.calls[0][0] as {
      apiAdapter: {
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    accountingSubjectApi.create.mockResolvedValueOnce({ success: false });
    accountingSubjectApi.update.mockResolvedValueOnce({ success: false });
    accountingSubjectApi.delete.mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.accounting_management_page.k0');
    await expect(props.apiAdapter.update('s1', {})).rejects.toThrow(
      'erp.accounting_management_page.k1'
    );
    await expect(props.apiAdapter.delete('s1')).rejects.toThrow(
      'erp.accounting_management_page.k2'
    );
  });

  it('期初余额 adapter：create 字段归一化（debit/credit 转 Number）+ 错误 k3/k4/k5', async () => {
    render(<AccountingManagementPage />);
    fireEvent.click(screen.getByText('erp.accounting_management_page.k12'));
    const calls = mockCrudPage.mock.calls;
    const props = calls[calls.length - 1][0] as {
      apiAdapter: {
        list: (p: unknown) => Promise<{ data: unknown[]; total: number }>;
        create: (d: unknown) => Promise<unknown>;
        update: (id: string, d: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
    };

    await props.apiAdapter.create({
      company_id: 'c1',
      subject_code: '1001',
      subject_name: '现金',
      period: '2026-01',
      debit_balance: '100.5',
      credit_balance: '0',
    });
    expect(openingBalanceApi.create).toHaveBeenCalledWith({
      company_id: 'c1',
      subject_code: '1001',
      subject_name: '现金',
      period: '2026-01',
      debit_balance: 100.5,
      credit_balance: 0,
    });

    openingBalanceApi.create.mockResolvedValueOnce({ success: false });
    openingBalanceApi.update.mockResolvedValueOnce({ success: false });
    openingBalanceApi.delete.mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.create({})).rejects.toThrow('erp.accounting_management_page.k3');
    await expect(props.apiAdapter.update('b1', {})).rejects.toThrow(
      'erp.accounting_management_page.k4'
    );
    await expect(props.apiAdapter.delete('b1')).rejects.toThrow(
      'erp.accounting_management_page.k5'
    );
  });
});
