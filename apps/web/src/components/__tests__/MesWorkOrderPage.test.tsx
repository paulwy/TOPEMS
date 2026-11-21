import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import MesWorkOrderPage from '../mes/MesWorkOrderPage';
import { mesApi } from '@/api/mes';

// MesWorkOrderPage：redesign 组件库形态（24 hooks）——useQuery（data 数组直返，API 失败
// 降级 mockOrders）+ deleteMutation（mesApi.workOrders.delete，onSuccess/onError 均
// invalidate+toast）+ ListPageTemplate（header/toolbar/footer 4 StatTile）+ Tabs + Drawer
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
  const DateRangePickerMock = (p: { value?: unknown; onChange?: (v: unknown) => void }) => (
    <input
      data-testid='date-range'
      onChange={p.onChange as () => void}
    />
  );
  const FileUploadMock = () => <div data-testid='file-upload' />;
  return {
    Badge: BadgeMock,
    Button: ButtonMock,
    Card: CardMock,
    DateRangePicker: DateRangePickerMock,
    Drawer: DrawerMock,
    FileUpload: FileUploadMock,
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

const mockOrders = vi.hoisted(() => [
  {
    id: '1',
    order_no: 'WO-001',
    product_name: '齿轮',
    product_code: 'PG-001',
    quantity: 500,
    completed_quantity: 320,
    status: 'in_progress',
    priority: 'high',
    workshop: '一号车间',
    production_line: 'A线',
    operator: '张工',
    planned_start: '2026-09-14 08:00',
    planned_end: '2026-09-15 18:00',
  },
  {
    id: '2',
    order_no: 'WO-002',
    product_name: '外壳',
    product_code: 'SS-002',
    quantity: 1000,
    completed_quantity: 1000,
    status: 'completed',
    priority: 'medium',
    workshop: '二号车间',
    production_line: 'B线',
    operator: '李工',
    planned_start: '2026-09-13 08:00',
    planned_end: '2026-09-14 18:00',
  },
  {
    id: '3',
    order_no: 'WO-003',
    product_name: '转子',
    product_code: 'MR-003',
    quantity: 200,
    completed_quantity: 0,
    status: 'pending',
    priority: 'low',
    workshop: '一号车间',
    production_line: 'C线',
    operator: '王工',
    planned_start: '2026-09-16 08:00',
    planned_end: '2026-09-17 18:00',
  },
]);

vi.mock('@/api/mes', () => ({
  mesApi: {
    workOrders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { work_orders: mockOrders } }),
      create: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

// 全 mock react-query：useQuery 直返 data 数组；useMutation 执行 mutationFn+onSuccess
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockOrders,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: (opts: {
    mutationFn: (arg: unknown) => Promise<unknown>;
    onSuccess?: (r: unknown) => void;
    onError?: (e: unknown) => void;
  }) => ({
    mutate: (arg: unknown) => {
      opts
        .mutationFn(arg)
        .then((r) => opts.onSuccess?.(r))
        .catch((e) => opts.onError?.(e));
    },
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

describe('MesWorkOrderPage（redesign 形态：ListPageTemplate + 4 StatTile + Tabs + 删除闭环）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
  });

  it('渲染 ListPageTemplate（header title/subtitle + data 3 行 + rowKey id）', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.header.title).toBe('mes.work_order_page.k10');
    expect(props.data).toHaveLength(3);
    expect(props.rowKey).toBe('id');
    expect(props.loading).toBe(false);
  });

  it('footer 4 个 StatTile（total/in_progress/pending/completed）', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.footer}</>);
    expect(getByText('mes.work_order_page.stat_total:3')).toBeInTheDocument();
    expect(getByText('mes.work_order.k26:1')).toBeInTheDocument();
    expect(getByText('mes.work_order.k25:1')).toBeInTheDocument();
    expect(getByText('mes.work_order.k28:1')).toBeInTheDocument();
  });

  it('列渲染（order_no/product/priority/workshop/operator/planned_end/actions）', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.columns.length).toBeGreaterThan(5);
    const orderNoCol = props.columns.find((c: { key: string }) => c.key === 'order_no');
    expect(orderNoCol.render(mockOrders[0])).not.toBeNull();
    const priorityCol = props.columns.find((c: { key: string }) => c.key === 'priority');
    expect(priorityCol.render(mockOrders[0])).not.toBeNull();
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render(mockOrders[0]);
    expect(actions.props.children).toHaveLength(3);
  });

  it('Tabs 渲染（all/pending/in_progress/completed + badges）', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    expect(screen.getByText(/mes.work_order_page.tab_all/)).toBeInTheDocument();
    expect(screen.getByText('mes.work_order.k25(1)')).toBeInTheDocument();
    expect(screen.getByText('mes.work_order.k26(1)')).toBeInTheDocument();
    expect(screen.getByText(/mes.work_order.k28/)).toBeInTheDocument();
  });

  it('删除闭环：actions delete → mesApi.workOrders.delete + invalidate + toast', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render(mockOrders[0]);
    // detail/edit/delete——delete 为第 3 个
    await act(async () => {
      actions.props.children[2].props.onClick();
    });
    await waitFor(() => {
      expect(mesApi.workOrders.delete).toHaveBeenCalledWith('1');
      expect(mockInvalidate).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('mes.work_order_page.toast_deleted')).toBeInTheDocument();
    });
  });

  it('详情 Drawer：tableProps.onRowClick 打开工单详情', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    act(() => props.tableProps.onRowClick(mockOrders[1]));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('toolbar 渲染（search/workshop Select/refresh/new）', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText, getByPlaceholderText } = render(<>{props.toolbar}</>);
    expect(getByPlaceholderText('mes.work_order_page.search_placeholder')).toBeInTheDocument();
    expect(getByText('mes.work_order_page.btn_refresh')).toBeInTheDocument();
    expect(getByText('mes.work_order_page.btn_new')).toBeInTheDocument();
  });

  it('Tabs 切换：点击 pending → ListPageTemplate data 过滤为 1', async () => {
    render(<MesWorkOrderPage />);
    await screen.findByTestId('list-page-template');

    fireEvent.click(screen.getByText(/mes.work_order.k25/));
    await waitFor(() => {
      const last = mockListPage.mock.calls.at(-1)[0];
      expect(last.data).toHaveLength(1);
      expect(last.data[0].status).toBe('pending');
    });
  });
});
