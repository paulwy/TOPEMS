import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BankAccountPage from '../erp/BankAccountPage';
import { bankAccountApi } from '@/api/erp';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页使用真实适配器做参数归一化/响应解包/错误翻译断言，需恢复真实实现。
vi.unmock('@/schema-dsl/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表与页面 breadcrumbs 使用的 erp.bank_account_page 译文（与 locales/zh/erp.json 一致）。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'erp.bank_account_page.k9': '首页',
        'erp.bank_account_page.k10': '银行账户管理',
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
    // 渲染 headerContent，使页面统计卡片组件真实挂载并触发其统计查询
    return <div data-testid='crud-page'>{props.headerContent as React.ReactNode}crud-page</div>;
  },
}));

vi.mock('@/schemas/erp/bankAccount', () => ({
  bankAccountSchema: { name: 'bankAccountSchema' },
}));

vi.mock('@/api/erp', () => ({
  bankAccountApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [{ id: 'ba-1', account_name: '基本存款户', balance: 1000.5, status: 'active' }],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'ba-9', account_name: '一般户', balance: 0, status: 'active' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'ba-1', account_name: '基本存款户', balance: 2000, status: 'frozen' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('BankAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with bankAccount schema and breadcrumbs', () => {
    render(<BankAccountPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'bankAccountSchema' },
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: 'ERP', href: '/erp' },
          { label: '银行账户管理' },
        ],
      })
    );
  });

  it('queries bank account stats once on mount via headerContent', () => {
    render(<BankAccountPage />);

    // BankAccountStats 统计卡片：固定拉取第 0 页 1000 条汇总余额与状态
    expect(bankAccountApi.list).toHaveBeenCalledWith({ page: 0, page_size: 1000 });
  });

  it('normalizes list params (pageSize→page_size) and unwraps list response', async () => {
    render(<BankAccountPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 50, search: '基本户' });

    expect(bankAccountApi.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
      search: '基本户',
    });
    expect(result).toEqual({
      data: [{ id: 'ba-1', account_name: '基本存款户', balance: 1000.5, status: 'active' }],
      total: 1,
    });
  });

  it('delegates bank account create, update and delete operations', async () => {
    render(<BankAccountPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ account_name: '一般户', balance: 0 })).resolves.toEqual({
      id: 'ba-9',
      account_name: '一般户',
      balance: 0,
      status: 'active',
    });
    await expect(
      props.apiAdapter.update('ba-1', { balance: 2000, status: 'frozen' })
    ).resolves.toEqual({ id: 'ba-1', account_name: '基本存款户', balance: 2000, status: 'frozen' });
    await expect(props.apiAdapter.delete('ba-1')).resolves.toBeUndefined();

    expect(bankAccountApi.create).toHaveBeenCalledWith({ account_name: '一般户', balance: 0 });
    expect(bankAccountApi.update).toHaveBeenCalledWith('ba-1', { balance: 2000, status: 'frozen' });
    expect(bankAccountApi.delete).toHaveBeenCalledWith('ba-1');
  });

  it('throws translated errors when bank account API operations fail', async () => {
    render(<BankAccountPage />);
    const props = mockCrudPage.mock.calls[0][0];
    // 渲染时统计卡片已消费默认成功响应，此处再注入一次性失败响应
    vi.mocked(bankAccountApi.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(bankAccountApi.create).mockResolvedValueOnce({ success: false });
    vi.mocked(bankAccountApi.update).mockResolvedValueOnce({ success: false });
    vi.mocked(bankAccountApi.delete).mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('ba-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('ba-1')).rejects.toThrow('删除失败');
  });
});
