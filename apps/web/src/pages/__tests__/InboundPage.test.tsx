import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import InboundPage from '../wms/InboundPage';
import { wmsApi } from '@/api/wms';

// InboundPage：ListPageTemplate 手写形态（13 hooks）——headerContent InboundStats（useQuery
// 拉 list 统计 4 卡）+ crud.api 委托 wmsApi.inboundOrders + customRowActions（confirm/complete）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

// 页面直接 import i18n 实例（default）——mock 使 t 直通（避免加载真实翻译资源）
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('@/utils/i18n', () => ({
  localizedName: (zh: string, _en?: string) => zh,
}));

const mockListPage = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());
const mockAddNotification = vi.hoisted(() => vi.fn());

// ListPageTemplate（@/components/templates）：记录 props（title/breadcrumbs/columns/data/
// headerContent/crud/rowActions）
vi.mock('@/components/templates/ListPageTemplate', () => ({
  ListPageTemplate: (p: Record<string, unknown>) => {
    mockListPage(p);
    return <div data-testid='list-page-template'>{p.children as React.ReactNode}</div>;
  },
}));

// FormBuilder（renderForm 内引用，ListPageTemplate mock 不渲染）
vi.mock('@/components/common', () => ({
  FormBuilder: (p: { onSubmit?: (v: unknown) => Promise<void>; onReset?: () => void }) => (
    <button
      data-testid='form-builder'
      onClick={() => p.onReset?.()}
    >
      form
    </button>
  ),
}));

vi.mock('@/schema-dsl', () => ({
  getColumns: () => [{ key: 'order_no', title: 'order_no' }],
  getFormFields: () => [{ key: 'order_no' }],
}));

vi.mock('@/schemas/wms', () => ({
  inboundOrderSchema: { formColCount: 2 },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    AD_HOC: {
      WMS_INBOUND_ORDERS_STATS_BASE: 'wms-inbound-orders-stats',
      WMS_INBOUND_ORDERS_BASE: 'wms-inbound-orders',
    },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: mockAddNotification }),
}));

const mockOrders = vi.hoisted(() => [
  { id: 'ib-1', order_no: 'IB001', status: 'pending' },
  { id: 'ib-2', order_no: 'IB002', status: 'receiving' },
  { id: 'ib-3', order_no: 'IB003', status: 'completed' },
  { id: 'ib-4', order_no: 'IB004', status: 'draft' },
]);

vi.mock('@/api/wms', () => ({
  wmsApi: {
    inboundOrders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { items: mockOrders, total: 4 } }),
      get: vi.fn().mockResolvedValue({ success: true, data: mockOrders[0] }),
      create: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      confirm: vi.fn().mockResolvedValue({ success: true }),
      complete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

// 全 mock react-query：useQuery 直返数据（InboundStats 统计用）；useQueryClient 返 invalidateQueries
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockOrders,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: (opts: { mutationFn: (arg: unknown) => Promise<unknown> }) => ({
    mutate: (arg: unknown) => {
      opts.mutationFn(arg).catch(() => {});
    },
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

describe('InboundPage（ListPageTemplate 手写形态：headerContent 统计卡 + crud 委托 + 行操作）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
    mockAddNotification.mockClear();
  });

  it('渲染 ListPageTemplate（title/breadcrumbs 2 层/columns/crud）', async () => {
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('pages.inbound_page.k18');
    expect(props.breadcrumbs).toHaveLength(2);
    expect(props.breadcrumbs[0].label).toBe('WMS');
    expect(props.columns).toHaveLength(1);
    expect(props.crud.queryKey).toBe('wms-inbound-orders');
    expect(props.crud.entityName).toBe('pages.inbound_page.k18');
  });

  it('headerContent InboundStats 统计卡（total/pending/receiving/completed）', async () => {
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText, getAllByText } = render(<>{props.headerContent}</>);
    // useQuery 直返 mockOrders → total 4 / pending 1 / receiving 1 / completed 1
    expect(getByText('pages.inbound_page.k0')).toBeInTheDocument();
    expect(getByText('4')).toBeInTheDocument();
    expect(getByText('pages.inbound_page.k1')).toBeInTheDocument();
    expect(getByText('pages.inbound_page.k2')).toBeInTheDocument();
    expect(getByText('pages.inbound_page.k3')).toBeInTheDocument();
    // pending/receiving/completed 三卡值均为 1
    expect(getAllByText('1')).toHaveLength(3);
  });

  it('crud.api 委托 wmsApi.inboundOrders（create/update/delete）', async () => {
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    await props.crud.api.create({ order_no: 'IB009' });
    expect(wmsApi.inboundOrders.create).toHaveBeenCalledWith({ order_no: 'IB009' });
    await props.crud.api.update('ib-1', { status: 'completed' });
    expect(wmsApi.inboundOrders.update).toHaveBeenCalledWith('ib-1', { status: 'completed' });
    await props.crud.api.delete('ib-1');
    expect(wmsApi.inboundOrders.delete).toHaveBeenCalledWith('ib-1');
  });

  it('rowActions confirm（pending 行）→ wmsApi.confirm + invalidate + toast', async () => {
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const confirmAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.inbound_page.k16')
    );
    expect(confirmAction.show({ status: 'pending' })).toBe(true);
    expect(confirmAction.show({ status: 'completed' })).toBe(false);

    await act(async () => {
      confirmAction.onClick({ id: 'ib-1' });
    });
    await waitFor(() => {
      expect(wmsApi.inboundOrders.confirm).toHaveBeenCalledWith('ib-1');
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('rowActions complete（receiving 行）→ wmsApi.complete + invalidate + toast', async () => {
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const completeAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.inbound_page.k17')
    );
    expect(completeAction.show({ status: 'receiving' })).toBe(true);
    expect(completeAction.show({ status: 'quality_check' })).toBe(true);
    expect(completeAction.show({ status: 'pending' })).toBe(false);

    await act(async () => {
      completeAction.onClick({ id: 'ib-2' });
    });
    await waitFor(() => {
      expect(wmsApi.inboundOrders.complete).toHaveBeenCalledWith('ib-2');
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });

  it('confirm 失败 → error toast（catch 分支）', async () => {
    vi.mocked(wmsApi.inboundOrders.confirm).mockRejectedValueOnce(new Error('boom'));
    render(<InboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const confirmAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.inbound_page.k16')
    );
    await act(async () => {
      confirmAction.onClick({ id: 'ib-1' });
    });
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'pages.inbound_page.k7' })
      );
    });
  });
});
