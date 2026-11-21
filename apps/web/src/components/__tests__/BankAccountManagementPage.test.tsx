import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BankAccountManagementPage from '../admin/BankAccountManagementPage';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, fallback?: string) => fallback ?? key,
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/admin', () => ({
  bankAccountSchema: { name: 'bankAccountSchema' },
}));

const mockApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/erp/bankAccount', () => ({
  bankAccountApi: mockApi,
  default: mockApi,
}));

describe('BankAccountManagementPage（F1 · 接真实 erp /bank-accounts）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('通过 CrudPage 渲染 bankAccount schema 与面包屑', () => {
    render(<BankAccountManagementPage />);
    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'bankAccountSchema' },
      })
    );
  });

  it('list 走真实接口并按后端字段映射为页面行模型', async () => {
    mockApi.list.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'acc-1',
            bank_name: '工商银行',
            account_number: '1234',
            account_name: '基本户',
            branch_name: '石家庄分行',
            currency: 'CNY',
            balance: '1234.50',
            is_default: true,
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
    });

    render(<BankAccountManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];
    const result = await props.apiAdapter.list({ page: 1, page_size: 20, search: '工商' });

    expect(mockApi.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 20,
      keyword: '工商',
      status: undefined,
    });
    expect(result).toEqual({
      total: 1,
      data: [
        {
          id: 'acc-1',
          account_name: '基本户',
          account_number: '1234',
          bank_name: '工商银行',
          bank_branch: '石家庄分行',
          currency: 'CNY',
          status: 'active',
          balance: 1234.5,
          is_primary: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('list 失败抛错（不回退 mock 数据）', async () => {
    mockApi.list.mockResolvedValue({ success: false, message: '接口不可用' });

    render(<BankAccountManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, page_size: 20 })).rejects.toThrow('接口不可用');
  });

  it('create/update/delete 走真实接口并做字段映射', async () => {
    mockApi.create.mockResolvedValue({
      success: true,
      data: {
        id: 'acc-9',
        bank_name: '建设银行',
        account_number: '9999',
        account_name: '一般户',
        branch_name: '桥西支行',
        currency: 'CNY',
        balance: 0,
        is_default: false,
        status: 'active',
      },
    });
    mockApi.update.mockResolvedValue({
      success: true,
      data: {
        id: 'acc-9',
        bank_name: '建设银行',
        account_number: '9999',
        account_name: '一般户',
        branch_name: '桥西支行',
        currency: 'CNY',
        balance: 500,
        is_default: true,
        status: 'frozen',
      },
    });
    mockApi.delete.mockResolvedValue({ success: true });

    render(<BankAccountManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.apiAdapter.create({
      bank_name: '建设银行',
      account_number: '9999',
      account_name: '一般户',
      bank_branch: '桥西支行',
      currency: 'CNY',
      is_primary: false,
    });
    expect(mockApi.create).toHaveBeenCalledWith({
      bank_name: '建设银行',
      account_number: '9999',
      account_name: '一般户',
      branch_name: '桥西支行',
      currency: 'CNY',
      balance: undefined,
      is_default: false,
      status: undefined,
    });

    await props.apiAdapter.update('acc-9', {
      status: 'frozen',
      balance: 500,
      is_primary: true,
    });
    expect(mockApi.update).toHaveBeenCalledWith('acc-9', {
      bank_name: '',
      account_number: '',
      account_name: '',
      branch_name: undefined,
      currency: undefined,
      balance: 500,
      is_default: true,
      status: 'frozen',
    });

    await props.apiAdapter.delete('acc-9');
    expect(mockApi.delete).toHaveBeenCalledWith('acc-9');
  });

  it('写操作失败抛错，不静默成功', async () => {
    mockApi.create.mockResolvedValue({ success: false, message: '创建被拒绝' });
    mockApi.delete.mockResolvedValue({ success: false, message: '删除被拒绝' });

    render(<BankAccountManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ account_name: 'x' })).rejects.toThrow('创建被拒绝');
    await expect(props.apiAdapter.delete('acc-1')).rejects.toThrow('删除被拒绝');
  });
});
