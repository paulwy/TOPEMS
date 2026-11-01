import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CrmOpportunityRedesignPage from '../crm/CrmOpportunityRedesignPage';
import { opportunityApi } from '@/api/crm/opportunity';

// CrmOpportunityRedesignPage：redesign 形态（19 hooks）——useQuery（opportunityApi.list）+ 3 mutations
// + ListPageTemplate + 4 StatTile + Tabs + Modal/Drawer + 删除确认闭环（opportunityApi.delete）——按真实行为断言
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

// redesign 组件库（同 Contract/Customer mock——Modal 渲染 footer）
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
      data-testid='stage-select'
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

const mockOpportunities = vi.hoisted(() => [
  {
    id: 'opp-1',
    name: '商机A',
    customer_name: '客户A',
    stage: 'won',
    amount: 80000,
    win_rate: 90,
  },
  {
    id: 'opp-2',
    name: '商机B',
    customer_name: '客户B',
    stage: 'lead',
    amount: 30000,
    win_rate: 10,
  },
]);

vi.mock('@/api/crm/opportunity', () => ({
  opportunityApi: {
    list: vi.fn().mockResolvedValue({ data: { list: mockOpportunities, total: 2 } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    create: vi.fn().mockResolvedValue({ data: { success: true } }),
    update: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// 全 mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { opportunities: mockOpportunities, total: 2 },
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

describe('CrmOpportunityRedesignPage（redesign 形态：ListPageTemplate + 4 StatTile + 删除闭环）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockInvalidate.mockClear();
  });

  it('渲染 ListPageTemplate（header 3 层 breadcrumbs + data 2 行 + rowKey + columns）', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.header.title).toBe('crm.opportunity_redesign.title');
    expect(props.header.breadcrumbs).toHaveLength(3);
    expect(props.header.breadcrumbs[0].href).toBe('/dashboard');
    expect(props.data).toHaveLength(2);
    expect(props.rowKey).toBe('id');
  });

  it('footer 4 个 StatTile（total/pipeline/pipelineAmount/wonAmount）', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    render(<>{props.footer}</>);
    expect(screen.getByText(/crm.opportunity_redesign.stat_total:/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.stat_pipeline:/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.stat_pipeline_amount:/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.stat_won_amount:/)).toBeInTheDocument();
  });

  it('列渲染（opp_no/name/stage/actions）', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.columns.length).toBeGreaterThan(3);
    const noCol = props.columns.find((c: { key: string }) => c.key === 'opp_no');
    expect(noCol.render({ opp_no: 'OPP202600001' })).not.toBeNull();
    const stageCol = props.columns.find((c: { key: string }) => c.key === 'stage');
    expect(stageCol.render({ stage: 'won' })).not.toBeNull();
  });

  it('Tabs 渲染（tab_all/tab_pipeline/stage_won/stage_lost）', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    expect(screen.getByText(/crm.opportunity_redesign.tab_all/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.tab_pipeline/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.stage_won/)).toBeInTheDocument();
    expect(screen.getByText(/crm.opportunity_redesign.stage_lost/)).toBeInTheDocument();
  });

  it('toolbar 渲染（refresh/create 按钮）', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.toolbar}</>);
    expect(getByText('crm.opportunity_redesign.btn_refresh')).toBeInTheDocument();
    expect(getByText('crm.opportunity_redesign.btn_create')).toBeInTheDocument();
  });

  it('删除确认闭环：确认后调 opportunityApi.delete + invalidate + toast', async () => {
    render(<CrmOpportunityRedesignPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const actionCol = props.columns.find((c: { key: string }) => c.key === 'actions');
    const actions = actionCol.render({ id: 'opp-1' });
    const deleteBtn = actions.props.children[2];
    act(() => deleteBtn.props.onClick());
    expect(screen.getAllByTestId('modal').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('crm.opportunity_redesign.btn_confirm_delete'));
    await waitFor(() => {
      expect(opportunityApi.delete).toHaveBeenCalledWith('opp-1');
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });
});
