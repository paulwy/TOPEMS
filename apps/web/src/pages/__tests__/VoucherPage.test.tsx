import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoucherPage from '../erp/VoucherPage';
import { voucherApi } from '@/api/finance';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页使用真实适配器做参数归一化/响应解包/错误翻译断言，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表与页面 breadcrumbs 使用的 erp.voucher_page 译文（与 locales/zh/erp.json 一致）。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'erp.voucher_page.k6': '凭证管理',
        'erp.voucher_page.k7': '财务管理',
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

vi.mock('@/schemas/erp/voucher', () => ({
  voucherSchema: { name: 'voucherSchema' },
}));

vi.mock('@/api/finance', () => ({
  voucherApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          { id: 'v-1', voucher_no: 'PZ-001', status: 'draft' },
          { id: 'v-2', voucher_no: 'PZ-002', status: 'posted' },
        ],
        total: 2,
      },
    }),
    get: vi.fn(),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'v-9', voucher_no: 'PZ-009', status: 'draft' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'v-1', voucher_no: 'PZ-001', status: 'submitted' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('VoucherPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with voucher schema and ERP/finance breadcrumbs', () => {
    render(<VoucherPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'voucherSchema' },
        breadcrumbs: [{ label: 'ERP' }, { label: '财务管理' }, { label: '凭证管理' }],
      })
    );
  });

  it('queries voucher stats once on mount via headerContent', () => {
    render(<VoucherPage />);

    // VoucherStats 统计卡片：固定拉取第 1 页 100 条进行状态分桶
    expect(voucherApi.list).toHaveBeenCalledWith({ page: 1, page_size: 100 });
  });

  it('normalizes list params (pageSize→page_size) and unwraps list response', async () => {
    render(<VoucherPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: 'PZ-01' });

    expect(voucherApi.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'PZ-01',
    });
    expect(result).toEqual({
      data: [
        { id: 'v-1', voucher_no: 'PZ-001', status: 'draft' },
        { id: 'v-2', voucher_no: 'PZ-002', status: 'posted' },
      ],
      total: 2,
    });
  });

  it('delegates voucher create, update and delete operations', async () => {
    render(<VoucherPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.create({ voucher_no: 'PZ-009', remark: '测试凭证' })
    ).resolves.toEqual({ id: 'v-9', voucher_no: 'PZ-009', status: 'draft' });
    await expect(props.apiAdapter.update('v-1', { status: 'submitted' })).resolves.toEqual({
      id: 'v-1',
      voucher_no: 'PZ-001',
      status: 'submitted',
    });
    await expect(props.apiAdapter.delete('v-1')).resolves.toBeUndefined();

    expect(voucherApi.create).toHaveBeenCalledWith({ voucher_no: 'PZ-009', remark: '测试凭证' });
    expect(voucherApi.update).toHaveBeenCalledWith('v-1', { status: 'submitted' });
    expect(voucherApi.delete).toHaveBeenCalledWith('v-1');
  });

  it('throws translated errors when voucher API operations fail', async () => {
    render(<VoucherPage />);
    const props = mockCrudPage.mock.calls[0][0];
    // 渲染时统计卡片已消费默认成功响应，此处再注入一次性失败响应
    vi.mocked(voucherApi.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(voucherApi.create).mockResolvedValueOnce({ success: false });
    vi.mocked(voucherApi.update).mockResolvedValueOnce({ success: false });
    vi.mocked(voucherApi.delete).mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('v-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('v-1')).rejects.toThrow('删除失败');
  });
});
