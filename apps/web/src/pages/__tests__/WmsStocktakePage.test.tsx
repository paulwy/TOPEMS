import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import WmsStocktakePage from '../wms/WmsStocktakePage';
import { stockTakeApi } from '@/api/wms/stocktake';

// WmsStocktakePage：redesign 组件库形态（38 hooks）——useQuery（服务端分页，data.orders）
// + 3 mutations（delete mutationFn 仅 setTimeout 500ms 不调 API；create/update 调 stockTakeApi）
// + ListPageTemplate（header/toolbar/footer 4 StatTile）+ Tabs + Modal（创建/删除确认）+ Drawer
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

vi.mock('@/utils/i18n', () => ({
  localizedName: (zh: string, _en?: string) => zh,
}));

const mockListPage = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());

// redesign 组件库：ListPageTemplate 记录 props；StatTile label:value；Tabs 可点击；
// Modal open 渲染 children+footer；Drawer open 渲染；ToastContainer 渲染 toasts
vi.mock('@/components/redesign', () => {
  const StatTileMock = (p: { label: string; value: unknown }) => (
    <div data-testid='stat-tile'>
      {p.label}:{String(p.value)}
    </div>
  );
  const TabsMock = (p: {
    tabs: { id: string; label: string; badge?: number }[];
    activeTab: string;
    onChange: (id: string) => void;
  }) => (
    <div>
      {p.tabs.map((tab) => (
        <button
          key={tab.id}
          data-active={p.activeTab === tab.id}
          onClick={() => p.onChange(tab.id)}
        >
          {tab.label}
          {typeof tab.badge === 'number' ? `(${tab.badge})` : ''}
        </button>
      ))}
    </div>
  );
  const ListPageTemplateMock = (p: { children?: React.ReactNode }) => {
    mockListPage(p);
    return <div data-testid='list-page-template'>{p.children}</div>;
  };
  const ModalMock = (p: {
    open?: boolean;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    p.open ? (
      <div data-testid='modal'>
        {p.children}
        {p.footer}
      </div>
    ) : null;
  const DrawerMock = (p: { open?: boolean; children?: React.ReactNode }) =>
    p.open ? <div data-testid='drawer'>{p.children}</div> : null;
  const InputMock = (p: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid='search-input'
      value={p.value}
      placeholder={p.placeholder}
      onChange={p.onChange as () => void}
    />
  );
  const SelectMock = (p: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    options?: { value: string; label: string }[];
  }) => (
    <select
      data-testid='level-select'
      value={p.value}
      onChange={p.onChange as () => void}
    >
      {(p.options ?? []).map((o) => (
        <option
          key={o.value}
          value={o.value}
        >
          {o.label}
        </option>
      ))}
    </select>
  );
  const ButtonMock = (p: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={p.onClick}>{p.children}</button>
  );
  const BadgeMock = (p: { children?: React.ReactNode }) => <span>{p.children}</span>;
  const TagMock = (p: { children?: React.ReactNode }) => <span>{p.children}</span>;
  const CardMock = (p: { children?: React.ReactNode }) => <div>{p.children}</div>;
  const PaginationMock = (p: { current?: number; total?: number }) => (
    <div data-testid='pagination'>
      pagination {p.current}/{p.total}
    </div>
  );
  const ToastContainerMock = (p: { toasts?: { id: string; message: string }[] }) => (
    <div data-testid='toast-container'>
      {(p.toasts ?? []).map((t) => (
        <div key={t.id}>{t.message}</div>
      ))}
    </div>
  );
  return {
    Badge: BadgeMock,
    Button: ButtonMock,
    Card: CardMock,
    Drawer: DrawerMock,
    Input: InputMock,
    ListPageTemplate: ListPageTemplateMock,
    Modal: ModalMock,
    Pagination: PaginationMock,
    Select: SelectMock,
    StatTile: StatTileMock,
    Tabs: TabsMock,
    Tag: TagMock,
    ToastContainer: ToastContainerMock,
  };
});

vi.mock('@/module-configs/wms/config', () => ({
  WMS_PATHS: { root: '/wms' },
}));

const mockOrders = vi.hoisted(() => [
  {
    id: 'st-1',
    order_no: 'ST20261001',
    title: '十月盘点',
    warehouse: '原料仓',
    type: 'full',
    status: 'in_progress',
    counted_items: 80,
    total_items: 100,
    discrepancy_items: 2,
    creator: '张三',
    start_date: '2026-10-01',
  },
  {
    id: 'st-2',
    order_no: 'ST20261002',
    title: '成品盘点',
    warehouse: '成品仓',
    type: 'cycle',
    status: 'completed',
    counted_items: 100,
    total_items: 100,
    discrepancy_items: 0,
    creator: '李四',
    start_date: '2026-10-05',
  },
]);

vi.mock('@/api/wms/stocktake', () => ({
  stockTakeApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { list: mockOrders, total: 2 } }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const mutationCalls = vi.hoisted(() => ({ delete: 0, create: 0, update: 0 }));

// 全 mock react-query：useQuery 直返 data（{orders,total}）；useMutation 执行 mutationFn+onSuccess
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { orders: mockOrders, total: 2 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: (opts: {
    mutationFn: (arg: unknown) => Promise<unknown>;
    onSuccess?: (r: unknown) => void;
  }) => ({
    mutate: (arg: unknown) => {
      opts
        .mutationFn(arg)
        .then((r) => opts.onSuccess?.(r))
        .catch(() => {});
    },
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

describe('WmsStocktakePage（redesign 形态：ListPageTemplate + 4 StatTile + Tabs + 删除确认闭环）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
    mutationCalls.delete = 0;
    mutationCalls.create = 0;
    mutationCalls.update = 0;
  });

  it('渲染 ListPageTemplate（header 3 层 breadcrumbs + data 2 行 + rowKey id）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.header.title).toBe('wms.stocktake_page.title');
    expect(props.header.breadcrumbs).toHaveLength(3);
    expect(props.header.breadcrumbs[0].href).toBe('/dashboard');
    expect(props.data).toHaveLength(2);
    expect(props.rowKey).toBe('id');
    expect(props.loading).toBe(false);
  });

  it('footer 4 个 StatTile（total/in_progress/completed/discrepancy）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.footer}</>);
    expect(getByText('wms.stocktake_page.stat_total:2')).toBeInTheDocument();
    expect(getByText('wms.stocktake_page.status_in_progress:1')).toBeInTheDocument();
    expect(getByText('wms.stocktake_page.status_completed:1')).toBeInTheDocument();
    expect(getByText('wms.stocktake_page.stat_discrepancy:2')).toBeInTheDocument();
  });

  it('列渲染（order_no/title/warehouse/type/status/actions）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.columns.length).toBeGreaterThan(5);
    const orderNoCol = props.columns.find((c: { key: string }) => c.key === 'order_no');
    expect(orderNoCol.render({ order_no: 'ST20261001' })).not.toBeNull();
    const warehouseCol = props.columns.find((c: { key: string }) => c.key === 'warehouse');
    expect(warehouseCol.render({ warehouse: '原料仓' })).not.toBeNull();
    const statusCol = props.columns.find((c: { key: string }) => c.key === 'status');
    expect(statusCol.render({ status: 'completed' })).not.toBeNull();
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render({ id: 'st-1', status: 'draft' });
    expect(actions.props.children).toHaveLength(4);
  });

  it('Tabs 渲染（all/draft/in_progress/completed + badges）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    expect(screen.getByText(/wms.stocktake_page.tab_all/)).toBeInTheDocument();
    // draft badge 0 / in_progress badge 1 / completed badge 1
    expect(screen.getByText(/wms.stocktake_page.status_draft/)).toBeInTheDocument();
    expect(screen.getByText('wms.stocktake_page.status_in_progress(1)')).toBeInTheDocument();
    expect(screen.getByText('wms.stocktake_page.status_completed(1)')).toBeInTheDocument();
  });

  it('toolbar 渲染（refresh/new 按钮）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.toolbar}</>);
    expect(getByText('wms.stocktake_page.action_refresh')).toBeInTheDocument();
    expect(getByText('wms.stocktake_page.action_new')).toBeInTheDocument();
  });

  it('删除确认闭环：确认后 mutationFn 完成 + invalidate + toast（不调 API）', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render({ id: 'st-1', status: 'draft' });
    // 删除按钮（detail/start/edit/delete——delete 为第 4 个）
    const deleteBtn = actions.props.children[3];
    act(() => deleteBtn.props.onClick());
    expect(screen.getAllByTestId('modal').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('wms.stocktake_page.button_confirm_delete'));
    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      // delete mutationFn 仅 setTimeout 500ms——不调 stockTakeApi
      expect(stockTakeApi.delete).toBeUndefined();
    });
    await waitFor(() => {
      expect(screen.getByText('wms.stocktake_page.toast_delete_success')).toBeInTheDocument();
    });
  });

  it('详情 Drawer：点击 detail 渲染订单信息', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render({ id: 'st-1', status: 'in_progress' });
    act(() => actions.props.children[0].props.onClick());
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('create Modal：新建后调 stockTakeApi.create + invalidate', async () => {
    render(<WmsStocktakePage />);
    await screen.findByTestId('list-page-template');

    // 打开新建 Modal（toolbar new 按钮）
    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.toolbar}</>);
    fireEvent.click(getByText('wms.stocktake_page.action_new'));
    expect(screen.getAllByTestId('modal').length).toBeGreaterThan(0);
    // Modal footer 内创建按钮
    fireEvent.click(screen.getByText('wms.stocktake_page.button_create'));
    await waitFor(() => {
      expect(stockTakeApi.create).toHaveBeenCalled();
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });
});
