import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PurchaseOrderPage from '../erp/PurchaseOrderPage';
import { erpApi } from '@/api/erp';

// PurchaseOrderPage 为手写 redesign 页面（ListPageTemplate + useQuery），
// 非 createCrudPageAdapter 形态；数据全 mock，断言 API 挂载/字段映射/失败兜底。

const mockListPage = vi.hoisted(() => vi.fn());
const mockTabs = vi.hoisted(() => vi.fn());

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => false,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/redesign', () => ({
  ListPageTemplate: (props: Record<string, unknown>) => {
    mockListPage(props);
    return (
      <div data-testid='list-page'>
        {props.children as React.ReactNode}
        {props.footer as React.ReactNode}
      </div>
    );
  },
  Tabs: (props: Record<string, unknown>) => {
    mockTabs(props);
    return <div data-testid='tabs' />;
  },
  Badge: () => <div data-testid='badge' />,
  Button: () => <button type='button' />,
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Drawer: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  FileUpload: () => <div />,
  Input: () => <input />,
  Modal: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  Pagination: () => <div data-testid='pagination' />,
  Select: () => <select />,
  StatTile: () => <div data-testid='stat-tile' />,
  Tag: () => <div data-testid='tag' />,
  ToastContainer: () => <div />,
}));

vi.mock('@/api/erp', () => ({
  erpApi: {
    purchaseOrders: {
      list: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const apiOrderRows = [
  {
    id: 'po-1',
    order_number: 'PO-001',
    supplier_name: '供应商甲',
    supplier_id: 'SUP-001',
    total_amount: 125000,
    currency: 'CNY',
    status: 'pending',
    created_by: '张三',
    created_at: '2026-09-14 09:30',
    expected_date: '2026-09-25',
    order_date: '2026-09-14',
    remark: '加急',
  },
  {
    id: 'po-2',
    order_number: 'PO-002',
    supplier_name: '供应商乙',
    supplier_id: 'SUP-002',
    total_amount: 86500,
    currency: 'USD',
    status: 'partially_received',
    created_by: '李四',
    created_at: '2026-09-13 14:20',
    expected_date: '2026-09-28',
    order_date: '2026-09-13',
  },
];

describe('PurchaseOrderPage（批次5）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(erpApi.purchaseOrders.list).mockResolvedValue({
      success: true,
      data: { orders: apiOrderRows, total: 2, page: 1, page_size: 50 },
    });
  });

  it('fetches purchase orders once on mount with fixed page/pageSize', async () => {
    render(<PurchaseOrderPage />);

    await waitFor(() => expect(erpApi.purchaseOrders.list).toHaveBeenCalledTimes(1));
    expect(erpApi.purchaseOrders.list).toHaveBeenCalledWith({ page: 1, pageSize: 50 });
  });

  it('renders ListPageTemplate with header, 9 columns and mapped API rows', async () => {
    render(<PurchaseOrderPage />);

    await waitFor(() =>
      expect(mockListPage).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ title: 'erp.purchase_order.title' }),
        })
      )
    );
    const props = mockListPage.mock.calls[mockListPage.mock.calls.length - 1][0];
    expect(props.columns).toHaveLength(9);
    // 操作列存在（详情/编辑/删除）
    expect((props.columns as { key: string }[]).map((c) => c.key)).toContain('actions');
  });

  it('maps API fields and normalizes statuses (pending→pending_approval, partially_received→received)', async () => {
    render(<PurchaseOrderPage />);

    await waitFor(() => {
      const props = mockListPage.mock.calls[mockListPage.mock.calls.length - 1][0];
      expect(props.data).toHaveLength(2);
    });
    const props = mockListPage.mock.calls[mockListPage.mock.calls.length - 1][0];
    const rows = props.data as Record<string, unknown>[];

    expect(rows[0]).toMatchObject({
      id: 'po-1',
      order_no: 'PO-001',
      supplier_code: 'SUP-001',
      status: 'pending_approval',
      buyer: '张三',
    });
    expect(rows[1]).toMatchObject({
      id: 'po-2',
      order_no: 'PO-002',
      status: 'received',
      currency: 'USD',
    });
  });

  it('renders status tabs (all/pending_approval/approved/ordered/received)', async () => {
    render(<PurchaseOrderPage />);

    await waitFor(() => expect(mockTabs).toHaveBeenCalled());
    const tabProps = mockTabs.mock.calls[mockTabs.mock.calls.length - 1][0];
    expect((tabProps.tabs as { id: string }[]).map((t) => t.id)).toEqual([
      'all',
      'pending_approval',
      'approved',
      'ordered',
      'received',
    ]);
  });

  it('shows error state (no mock fallback) when API returns success:false', async () => {
    vi.mocked(erpApi.purchaseOrders.list).mockResolvedValueOnce({ success: false });

    render(<PurchaseOrderPage />);

    await waitFor(() => {
      const props = mockListPage.mock.calls[mockListPage.mock.calls.length - 1][0];
      // 不再回退假数据：列表为空，且把错误交给 ListPageTemplate 展示
      expect(props.data).toHaveLength(0);
      expect(props.error).toBe('erp.purchase_order.error.load');
    });
  });
});
