import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CRMBillingPage from '../crm/CRMBillingPage';
import { crmApi, crmAnalyticsApi } from '@/api/crm';

// CRMBillingPage：useQuery 拉账单聚合（统计卡/状态饼/top10/账龄）+ tabs 切换（overview/invoices/aging）
// + 内联 schema（billingSchema 过滤 actions 仅 detail）+ 只读 adapter（create/update/delete 恒定抛）——按真实行为断言
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// 部分 mock：importOriginal 展开真实模块（QueryCache），仅覆盖页面 useQuery
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: () => ({
      data: {
        data: {
          status_pie: [
            { status: 'paid', count: 5, amount: 1000 },
            { status: 'pending', count: 3, amount: 600 },
            { status: 'overdue', count: 2, amount: 400 },
          ],
          top_customers: [
            { name: '客户甲', value: 800 },
            { name: '客户乙', value: 500 },
          ],
          aging: [
            { name: '0-30天', value: 4 },
            { name: '31-60天', value: 2 },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
    }),
  };
});

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/crm', () => ({
  billingSchema: {
    name: 'billingSchema',
    actions: ['create', 'detail', 'update', 'delete'],
  },
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    billing: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [{ id: 'b1', invoice_no: 'INV-001', amount: 100 }],
          total: 1,
        },
      }),
    },
  },
  crmAnalyticsApi: {
    getBilling: vi.fn().mockResolvedValue({
      success: true,
      data: {
        status_pie: [],
        top_customers: [],
        aging: [],
      },
    }),
  },
}));

describe('CRMBillingPage（useQuery 聚合 + tabs + 只读 adapter）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初始 overview tab：渲染 4 张统计卡（count + 金额）', () => {
    render(<CRMBillingPage />);

    // 4 卡 label（crm.billing.stat_total/paid/pending/overdue）
    expect(screen.getByText('crm.billing.stat_total')).toBeInTheDocument();
    expect(screen.getByText('crm.billing.stat_paid')).toBeInTheDocument();
    expect(screen.getByText('crm.billing.stat_pending')).toBeInTheDocument();
    expect(screen.getByText('crm.billing.stat_overdue')).toBeInTheDocument();
    // totalCount = 5+3+2 = 10
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('状态饼渲染（status label + 金额 + 百分比 + count）', () => {
    render(<CRMBillingPage />);

    expect(screen.getByText('crm.billing.status_paid')).toBeInTheDocument();
    // ¥1000 (50.0%)——总金额 1000+600+400=2000
    expect(screen.getByText('¥1,000 (50.0%)')).toBeInTheDocument();
    expect(screen.getByText('crm.billing.status_overdue')).toBeInTheDocument();
  });

  it('Top10 渲染（客户名 + 金额；无 status 时中性 chip）', () => {
    render(<CRMBillingPage />);

    expect(screen.getByText('客户甲')).toBeInTheDocument();
    expect(screen.getByText('客户乙')).toBeInTheDocument();
    expect(screen.getByText('¥800')).toBeInTheDocument();
    // 无 status 时 chip 显示 '—'（每客户一个）
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('账龄桶渲染（bucket + count + 进度条）', () => {
    render(<CRMBillingPage />);

    expect(screen.getByText('0-30天')).toBeInTheDocument();
    expect(screen.getByText('31-60天')).toBeInTheDocument();
  });

  it('切换到 invoices tab：经 CrudPage 渲染（schema actions 仅 detail + breadcrumbs 两层）', () => {
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_invoices'));

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.schema).toEqual(
      expect.objectContaining({
        name: 'billingSchema',
        actions: ['detail'],
      })
    );
    expect(props.breadcrumbs).toEqual([
      { label: 'crm.common.crm' },
      { label: 'crm.billing.breadcrumb' },
    ]);
  });

  it('list 调 crmApi.billing.list + {items,total} 解包', async () => {
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_invoices'));
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 20 });
    expect(crmApi.billing.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list 数组形态解包（data 直接数组时 items=数组）', async () => {
    crmApi.billing.list.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'a1' }, { id: 'a2' }],
    });
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_invoices'));
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1 });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('list 失败（success=false）抛 error_load_list', async () => {
    crmApi.billing.list.mockResolvedValueOnce({ success: false, message: 'boom' });
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_invoices'));
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1 })).rejects.toThrow('boom');
  });

  it('create/update/delete 恒定抛只读错误（账单只读）', async () => {
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_invoices'));
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({})).rejects.toThrow('Billing records are read-only');
    await expect(props.apiAdapter.update('b1', {})).rejects.toThrow(
      'Billing records are read-only'
    );
    await expect(props.apiAdapter.delete('b1')).rejects.toThrow('Billing records are read-only');
  });

  it('tab 切换：aging tab 渲染账龄明细（bucket + count）', () => {
    render(<CRMBillingPage />);
    fireEvent.click(screen.getByText('crm.billing.tab_aging'));

    // aging tab 每个 bucket 单独 Paper（0-30天 / 31-60天）；统计卡为顶层常驻不随 tab 切换
    expect(screen.getByText('0-30天')).toBeInTheDocument();
    expect(screen.getByText('31-60天')).toBeInTheDocument();
    // aging tab 不再渲染状态饼/统计卡之外的 overview 区块（section_status_pie 标题消失）
    expect(screen.queryByText('crm.billing.section_status_pie')).not.toBeInTheDocument();
  });
});
