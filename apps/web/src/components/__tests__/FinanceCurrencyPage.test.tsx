import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import FinanceCurrencyPage from '../finance/FinanceCurrencyPage';
import { financeApi } from '@/api/finance';

// 自绘列表页（PageContainer + MUI Table/Dialog/Switch），走 DevicePage 形态：
// mock 页面实际 import 的 api 模块，断言 list 参数归一化、行渲染、空态、弹窗与增删改调用。
// 注：zh locale 未收录 finance.currency_page.* 文案，harness 下 t() 回退为原始 key，
// 故渲染断言以原始 i18n key 作为期望值。
vi.mock('@/api/finance', () => ({
  financeApi: {
    currency: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

const mockAddNotification = vi.hoisted(() => vi.fn());

vi.mock('@/store', () => ({
  useNotificationStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      notifications: [],
      addNotification: mockAddNotification,
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useAuthStore: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
    isAuthenticated: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    isSuperuser: vi.fn(() => true),
    getDisplayName: vi.fn(() => 'Test User'),
    getAvatarUrl: vi.fn(() => ''),
  })),
  useThemeStore: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
  useUIStore: vi.fn(() => ({
    sidebarOpen: true,
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    toggleSidebarCollapsed: vi.fn(),
    setSidebarCollapsed: vi.fn(),
  })),
}));

const currencyRow = {
  id: 'c1',
  code: 'USD',
  name: '美元',
  symbol: '$',
  exchange_rate: 7.2,
  is_active: true,
};

const listResponse = {
  success: true,
  data: { items: [currencyRow], total: 1, page: 1, page_size: 10 },
};

describe('FinanceCurrencyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(financeApi.currency.list).mockResolvedValue(listResponse as never);
    vi.mocked(financeApi.currency.create).mockResolvedValue({
      success: true,
      data: { id: 'c2' },
    } as never);
    vi.mocked(financeApi.currency.update).mockResolvedValue({
      success: true,
      data: { id: 'c1' },
    } as never);
    vi.mocked(financeApi.currency.remove).mockResolvedValue({ success: true } as never);
  });

  it('renders heading, table headers and currency rows with list params', async () => {
    render(<FinanceCurrencyPage />);

    expect(await screen.findByText('finance.currency_page.title')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('finance.currency_page.search_placeholder')
    ).toBeInTheDocument();
    expect(screen.getByText('finance.currency_page.add')).toBeInTheDocument();

    // 表头
    expect(screen.getByText('finance.currency_page.col_code')).toBeInTheDocument();
    expect(screen.getByText('finance.currency_page.col_name')).toBeInTheDocument();
    expect(screen.getByText('finance.currency_page.col_symbol')).toBeInTheDocument();
    expect(screen.getByText('finance.currency_page.col_rate')).toBeInTheDocument();

    // 行数据渲染（exchange_rate 保留 4 位小数）
    expect(await screen.findByText('USD')).toBeInTheDocument();
    expect(screen.getByText('美元')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('7.2000')).toBeInTheDocument();

    // list 参数归一化：page 从 0 → 1，page_size 固定 10，空搜索为 undefined
    await waitFor(() =>
      expect(financeApi.currency.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        search: undefined,
      })
    );
  });

  it('renders empty state when list returns no items', async () => {
    vi.mocked(financeApi.currency.list).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 10 },
    } as never);

    render(<FinanceCurrencyPage />);

    expect(await screen.findByText('finance.currency_page.title')).toBeInTheDocument();
    expect(await screen.findByText('common.no_data')).toBeInTheDocument();
    expect(screen.queryByText('USD')).not.toBeInTheDocument();
  });

  it('refetches with search keyword when typing in search box', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    fireEvent.change(screen.getByPlaceholderText('finance.currency_page.search_placeholder'), {
      target: { value: 'EUR' },
    });

    await waitFor(() =>
      expect(financeApi.currency.list).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        search: 'EUR',
      })
    );
  });

  it('opens create dialog, binds controlled inputs and creates with normalized payload', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    fireEvent.click(screen.getByText('finance.currency_page.add'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('finance.currency_page.add_title');

    const codeInput = within(dialog).getByLabelText('finance.currency_page.col_code');
    fireEvent.change(codeInput, { target: { value: ' usd ' } });
    expect(codeInput).toHaveValue(' usd ');
    fireEvent.change(within(dialog).getByLabelText('finance.currency_page.col_name'), {
      target: { value: '欧元' },
    });
    fireEvent.change(within(dialog).getByLabelText('finance.currency_page.col_symbol'), {
      target: { value: '€' },
    });
    fireEvent.change(within(dialog).getByLabelText('finance.currency_page.col_rate'), {
      target: { value: '7.8' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));

    // handleSave 在按钮新鲜闭包里读取受控 form，vars 原样传入冻结的 mutate：
    // create 的精确归一化 payload（trim/大写/转数值）可经 UI 交互观测
    await waitFor(() =>
      expect(financeApi.currency.create).toHaveBeenCalledWith({
        code: 'USD',
        name: '欧元',
        symbol: '€',
        exchange_rate: 7.8,
      })
    );
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'finance.currency_page.created' })
      )
    );
  });

  it('rejects invalid form client-side without calling create API', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    fireEvent.click(screen.getByText('finance.currency_page.add'));
    const dialog = await screen.findByRole('dialog');

    // code 留空 → 前端校验拦截，不发起 API 调用
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));

    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: 'finance.currency_page.invalid_form' })
      )
    );
    expect(financeApi.currency.create).not.toHaveBeenCalled();
  });

  it('opens edit dialog prefilled from the clicked row', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    const row = screen.getByText('USD').closest('tr') as HTMLElement;
    // 行内按钮顺序：编辑（Pencil）在前，删除（Trash2）在后
    fireEvent.click(within(row).getAllByRole('button')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('finance.currency_page.edit_title');

    expect(within(dialog).getByLabelText('finance.currency_page.col_code')).toHaveValue('USD');
    expect(within(dialog).getByLabelText('finance.currency_page.col_name')).toHaveValue('美元');
    expect(within(dialog).getByLabelText('finance.currency_page.col_symbol')).toHaveValue('$');
    // number 型输入框 RTL 以 valueAsNumber 取值
    expect(within(dialog).getByLabelText('finance.currency_page.col_rate')).toHaveValue(7.2);
  });

  it('calls update with row id and flipped active flag when toggling switch', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    fireEvent.click(screen.getByRole('switch'));

    // toggleActive 的 vars 走调用参数（id + 翻转后的 is_active），可断言精确参数
    await waitFor(() =>
      expect(financeApi.currency.update).toHaveBeenCalledWith('c1', { is_active: false })
    );
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'finance.currency_page.updated' })
      )
    );
  });

  it('calls remove with row id when clicking delete button', async () => {
    render(<FinanceCurrencyPage />);
    await screen.findByText('USD');

    const row = screen.getByText('USD').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button')[1]);

    await waitFor(() => expect(financeApi.currency.remove).toHaveBeenCalledWith('c1'));
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'finance.currency_page.deleted' })
      )
    );
  });
});
