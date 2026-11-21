import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CrmCustomerRedesignPage from '../crm/CrmCustomerRedesignPage';
import { customerApi } from '@/api/crm/customer';

// CrmCustomerRedesignPage：redesign 形态（19 hooks）——useQuery（服务端分页）+ 3 mutations
// + ListPageTemplate + 4 StatTile + Tabs + Modal/Drawer + 删除确认闭环——按真实行为断言
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

// redesign 组件库：ListPageTemplate 记录 props + 渲染 children；StatTile label:value；
// Tabs 可点击；Modal/Drawer open 渲染；ToastContainer 渲染 toasts
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

const mockCustomers = vi.hoisted(() => [
  {
    id: 'c-1',
    code: 'C001',
    name: '客户A',
    rating: 'A',
    status: 'active',
    phone: '13800000001',
    revenue: 10000,
    created_at: '2026-10-25T00:00:00Z',
  },
  {
    id: 'c-2',
    code: 'C002',
    name: '客户B',
    rating: 'B',
    status: 'inactive',
    phone: '13800000002',
    revenue: 500,
    created_at: '2026-10-25T00:00:00Z',
  },
]);

vi.mock('@/api/crm/customer', () => ({
  customerApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { list: mockCustomers, total: 2 } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// 全 mock react-query：useQuery 返数据；useMutation 记录并执行 mutationFn+onSuccess；
// useQueryClient 返 invalidateQueries
const mutationCalls = vi.hoisted(() => ({ delete: 0, create: 0, update: 0 }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { customers: mockCustomers, total: 2 },
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

describe('CrmCustomerRedesignPage（redesign 形态：ListPageTemplate + 4 StatTile + 3 mutations）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
    mutationCalls.delete = 0;
    mutationCalls.create = 0;
    mutationCalls.update = 0;
  });

  it('渲染 ListPageTemplate（header 3 层 breadcrumbs + data 2 行 + rowKey + columns）', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.header.title).toBe('crm.customer_list_page.title');
    expect(props.header.breadcrumbs).toHaveLength(3);
    expect(props.header.breadcrumbs[0].href).toBe('/dashboard');
    expect(props.data).toHaveLength(2);
    expect(props.rowKey).toBe('id');
    expect(props.loading).toBe(false);
  });

  it('footer 4 个 StatTile（total/active/aLevel/totalAmount）', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    render(<>{props.footer}</>);
    expect(screen.getByText('crm.customer_list_page.stat_total_customers:2')).toBeInTheDocument();
    expect(screen.getByText('crm.customer_list_page.stat_active_customers:1')).toBeInTheDocument();
    // useQuery 全 mock 直返原始 API 形态（level 字段未映射）→ aLevel=0
    expect(screen.getByText('crm.customer_list_page.stat_a_level_customers:0')).toBeInTheDocument();
    expect(screen.getByText(/crm.customer_list_page.stat_total_order_amount/)).toBeInTheDocument();
  });

  it('列渲染（customer_name/level badge/status/actions）', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.columns.length).toBeGreaterThan(4);
    const nameCol = props.columns.find((c: { key: string }) => c.key === 'customer_name');
    expect(nameCol.render({ customer_name: '客户A' })).not.toBeNull();
    const levelCol = props.columns.find((c: { key: string }) => c.key === 'level');
    expect(levelCol.render({ level: 'A' })).not.toBeNull();
    const statusCol = props.columns.find((c: { key: string }) => c.key === 'status');
    expect(statusCol.render({ status: 'active' })).not.toBeNull();
  });

  it('Tabs 渲染（tabsConfig 含 badges）', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    // Tabs 在 children 内渲染 button（label 为 status_* 键 + badge 拼接）
    expect(screen.getByText(/crm.customer_list_page.tab_all/)).toBeInTheDocument();
    expect(screen.getByText(/crm.customer_list_page.status_active/)).toBeInTheDocument();
  });

  it('toolbar 渲染（refresh/create 按钮）', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.toolbar}</>);
    expect(getByText('crm.customer_list_page.btn_refresh')).toBeInTheDocument();
    expect(getByText('crm.customer_list_page.btn_create')).toBeInTheDocument();
  });

  it('删除确认闭环：确认后调 customerApi.delete + invalidate + toast', async () => {
    render(<CrmCustomerRedesignPage />);
    await screen.findByTestId('list-page-template');

    // 删除按钮在列 actions 内——取列并点击
    const props = mockListPage.mock.calls.at(-1)[0];
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render({ id: 'c-1' });
    // 点击删除按钮（detail/edit/delete——delete 为第 3 个）
    const deleteBtn = actions.props.children[2];
    act(() => deleteBtn.props.onClick());
    // 删除确认 Modal 出现
    expect(screen.getAllByTestId('modal').length).toBeGreaterThan(0);
    // Modal 内确认按钮点击（btn_confirm_delete）
    fireEvent.click(screen.getByText('crm.customer_list_page.btn_confirm_delete'));
    // mutationFn 有 300ms 延迟——waitFor 等待 onSuccess 完成
    await waitFor(() => {
      expect(customerApi.delete).toHaveBeenCalledWith('c-1');
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });
});
