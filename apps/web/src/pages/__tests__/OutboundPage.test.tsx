import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import OutboundPage from '../wms/OutboundPage';
import { wmsApi } from '@/api/wms';

// OutboundPage：ListPageTemplate 手写形态（15 hooks）——headerContent OutboundStats（useQuery
// 拉 list 统计 4 卡）+ crud.api 委托 wmsApi.outboundOrders + 4 个 customRowActions
// （confirm/pick/ship/complete）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

// 页面直接 import i18n 实例（default）——mock 使 t 直通
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('@/utils/i18n', () => ({
  localizedName: (zh: string, _en?: string) => zh,
}));

const mockListPage = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());
const mockAddNotification = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/ListPageTemplate', () => ({
  ListPageTemplate: (p: Record<string, unknown>) => {
    mockListPage(p);
    return <div data-testid='list-page-template'>{p.children as React.ReactNode}</div>;
  },
}));

vi.mock('@/components/common', () => ({
  FormBuilder: (p: { onReset?: () => void }) => (
    <button
      data-testid='form-builder'
      onClick={() => p.onReset?.()}
    >
      form
    </button>
  ),
}));

vi.mock('@/schema', () => ({
  getColumns: () => [{ key: 'order_no', title: 'order_no' }],
  getFormFields: () => [{ key: 'order_no' }],
}));

vi.mock('@/schemas/wms', () => ({
  outboundOrderSchema: { formColCount: 2 },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    AD_HOC: {
      WMS_OUTBOUND_ORDERS_STATS_BASE: 'wms-outbound-orders-stats',
      WMS_OUTBOUND_ORDERS_BASE: 'wms-outbound-orders',
    },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: mockAddNotification }),
}));

const mockOrders = vi.hoisted(() => [
  { id: 'ob-1', order_no: 'OB001', status: 'pending' },
  { id: 'ob-2', order_no: 'OB002', status: 'picking' },
  { id: 'ob-3', order_no: 'OB003', status: 'shipped' },
  { id: 'ob-4', order_no: 'OB004', status: 'draft' },
]);

vi.mock('@/api/wms', () => ({
  wmsApi: {
    outboundOrders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { items: mockOrders, total: 4 } }),
      get: vi.fn().mockResolvedValue({ success: true, data: mockOrders[0] }),
      create: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      confirm: vi.fn().mockResolvedValue({ success: true }),
      pick: vi.fn().mockResolvedValue({ success: true }),
      ship: vi.fn().mockResolvedValue({ success: true }),
      complete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

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

describe('OutboundPage（ListPageTemplate 手写形态：统计卡 + crud 委托 + 4 行操作）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
    mockAddNotification.mockClear();
  });

  it('渲染 ListPageTemplate（title/breadcrumbs 2 层/columns/crud）', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('pages.outbound_page.k28');
    expect(props.breadcrumbs).toHaveLength(2);
    expect(props.breadcrumbs[0].label).toBe('WMS');
    expect(props.crud.queryKey).toBe('wms-outbound-orders');
  });

  it('headerContent OutboundStats 统计卡（total/pending/picking/completed）', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText, getAllByText } = render(<>{props.headerContent}</>);
    expect(getByText('pages.outbound_page.k0')).toBeInTheDocument();
    expect(getByText('4')).toBeInTheDocument();
    expect(getByText('pages.outbound_page.k1')).toBeInTheDocument();
    expect(getByText('pages.outbound_page.k2')).toBeInTheDocument();
    expect(getByText('pages.outbound_page.k3')).toBeInTheDocument();
    expect(getAllByText('1')).toHaveLength(3);
  });

  it('crud.api 委托 wmsApi.outboundOrders（create/update/delete）', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    await props.crud.api.create({ order_no: 'OB009' });
    expect(wmsApi.outboundOrders.create).toHaveBeenCalledWith({ order_no: 'OB009' });
    await props.crud.api.update('ob-1', { status: 'shipped' });
    expect(wmsApi.outboundOrders.update).toHaveBeenCalledWith('ob-1', { status: 'shipped' });
    await props.crud.api.delete('ob-1');
    expect(wmsApi.outboundOrders.delete).toHaveBeenCalledWith('ob-1');
  });

  it('rowActions confirm（pending 行）→ wmsApi.confirm + invalidate + toast', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const confirmAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.outbound_page.k24')
    );
    expect(confirmAction.show({ status: 'pending' })).toBe(true);
    expect(confirmAction.show({ status: 'picking' })).toBe(false);

    await act(async () => {
      confirmAction.onClick({ id: 'ob-1' });
    });
    await waitFor(() => {
      expect(wmsApi.outboundOrders.confirm).toHaveBeenCalledWith('ob-1');
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('rowActions pick（confirmed/picking 行）→ wmsApi.pick', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const pickAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.outbound_page.k25')
    );
    expect(pickAction.show({ status: 'confirmed' })).toBe(true);
    expect(pickAction.show({ status: 'picking' })).toBe(true);

    await act(async () => {
      pickAction.onClick({ id: 'ob-2' });
    });
    await waitFor(() => {
      expect(wmsApi.outboundOrders.pick).toHaveBeenCalledWith('ob-2');
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });

  it('rowActions ship（picked/packing 行）→ wmsApi.ship(id, [])', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const shipAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.outbound_page.k26')
    );
    expect(shipAction.show({ status: 'picked' })).toBe(true);
    expect(shipAction.show({ status: 'packing' })).toBe(true);

    await act(async () => {
      shipAction.onClick({ id: 'ob-3' });
    });
    await waitFor(() => {
      expect(wmsApi.outboundOrders.ship).toHaveBeenCalledWith('ob-3', []);
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });

  it('rowActions complete（shipped 行）→ wmsApi.complete + toast', async () => {
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const completeAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.outbound_page.k27')
    );
    expect(completeAction.show({ status: 'shipped' })).toBe(true);
    expect(completeAction.show({ status: 'pending' })).toBe(false);

    await act(async () => {
      completeAction.onClick({ id: 'ob-3' });
    });
    await waitFor(() => {
      expect(wmsApi.outboundOrders.complete).toHaveBeenCalledWith('ob-3');
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('confirm 失败 → error toast（catch 分支）', async () => {
    vi.mocked(wmsApi.outboundOrders.confirm).mockRejectedValueOnce(new Error('boom'));
    render(<OutboundPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const confirmAction = props.crud.rowActions.find((a: { label: string }) =>
      a.label.includes('pages.outbound_page.k24')
    );
    await act(async () => {
      confirmAction.onClick({ id: 'ob-1' });
    });
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'pages.outbound_page.k7' })
      );
    });
  });
});
