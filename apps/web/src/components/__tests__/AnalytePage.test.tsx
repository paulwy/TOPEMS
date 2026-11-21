import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import AnalytePage from '../lims/AnalytePage';
import { analyteApi } from '@/api/lims/analytes';

// 自绘列表页（PageContainer + MUI Table/Dialog），走 DevicePage 形态：
// mock 页面实际 import 的 api 模块，断言 list 参数归一化、行渲染、空态与增删改调用。
vi.mock('@/api/lims/analytes', () => ({
  analyteApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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

const analyteRow = {
  id: 'a1',
  analyte_code: 'ANA-001',
  analyte_name: '铜含量',
  analyte_name_en: 'Copper',
  category: '金属',
  unit: '%',
  method_reference: 'GB/T 5121.1',
  limit_value: '≤0.5',
  accuracy: '0.01%',
  status: 'active',
  description: '',
};

const listResponse = {
  success: true,
  data: { items: [analyteRow], total: 1, page: 1, page_size: 10 },
};

describe('AnalytePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyteApi.list).mockResolvedValue(listResponse as never);
    vi.mocked(analyteApi.create).mockResolvedValue({
      success: true,
      data: { id: 'a9' },
    } as never);
    vi.mocked(analyteApi.update).mockResolvedValue({ success: true } as never);
    vi.mocked(analyteApi.remove).mockResolvedValue({ success: true } as never);
  });

  it('renders heading, table headers and analyte rows with list params', async () => {
    render(<AnalytePage />);

    expect(await screen.findByText('检验项目')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索编码 / 名称')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();

    // 表头
    expect(screen.getByText('项目编码')).toBeInTheDocument();
    expect(screen.getByText('项目名称')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
    expect(screen.getByText('单位')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();

    // 行数据渲染
    expect(await screen.findByText('ANA-001')).toBeInTheDocument();
    expect(screen.getByText('铜含量')).toBeInTheDocument();
    expect(screen.getByText('金属')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // list 参数：page 从 0 → 1，page_size 固定 10，空搜索为 undefined
    await waitFor(() =>
      expect(analyteApi.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        search: undefined,
      })
    );
  });

  it('renders empty table when list returns no items', async () => {
    vi.mocked(analyteApi.list).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 10 },
    } as never);

    render(<AnalytePage />);

    expect(await screen.findByText('检验项目')).toBeInTheDocument();
    await waitFor(() => expect(analyteApi.list).toHaveBeenCalled());
    expect(screen.queryByText('ANA-001')).not.toBeInTheDocument();
  });

  it('silently falls back to empty rows when list reports success=false', async () => {
    vi.mocked(analyteApi.list).mockResolvedValue({ success: false, data: null } as never);

    render(<AnalytePage />);

    await screen.findByText('检验项目');
    await waitFor(() => expect(analyteApi.list).toHaveBeenCalled());
    expect(screen.queryByText('ANA-001')).not.toBeInTheDocument();
  });

  it('refetches with search keyword when typing in search box', async () => {
    render(<AnalytePage />);
    await screen.findByText('检验项目');

    fireEvent.change(screen.getByPlaceholderText('搜索编码 / 名称'), {
      target: { value: '铜' },
    });

    await waitFor(() =>
      expect(analyteApi.list).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        search: '铜',
      })
    );
  });

  // 注：测试环境 mock 的 useMutation.mutate 闭包冻结在首次渲染（依赖 mutationFn.toString()），
  // 保存按钮闭包里的 form/editingId 不会随 React state 更新，故此处断言弹窗开关、表单受控输入、
  // 行数据回填，以及“保存”按钮确实触发对应创建接口（delete 的 id 走调用参数 vars 可精确断言）。
  it('opens create dialog, binds controlled inputs and triggers create on save', async () => {
    render(<AnalytePage />);
    await screen.findByText('ANA-001');

    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建');

    const codeInput = within(dialog).getByLabelText('项目编码');
    fireEvent.change(codeInput, { target: { value: 'ANA-009' } });
    expect(codeInput).toHaveValue('ANA-009');
    expect(within(dialog).getByLabelText('项目名称')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('方法依据')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(analyteApi.create).toHaveBeenCalled());
  });

  it('opens edit dialog prefilled from the clicked row', async () => {
    render(<AnalytePage />);
    await screen.findByText('ANA-001');

    const row = screen.getByText('ANA-001').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('编辑');

    expect(within(dialog).getByLabelText('项目编码')).toHaveValue('ANA-001');
    expect(within(dialog).getByLabelText('项目名称')).toHaveValue('铜含量');
    expect(within(dialog).getByLabelText('分类')).toHaveValue('金属');
    expect(within(dialog).getByLabelText('单位')).toHaveValue('%');
    expect(within(dialog).getByLabelText('状态')).toHaveValue('active');
  });

  it('calls remove with row id and notifies when clicking delete button', async () => {
    render(<AnalytePage />);
    await screen.findByText('ANA-001');

    const row = screen.getByText('ANA-001').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button')[1]);

    await waitFor(() => expect(analyteApi.remove).toHaveBeenCalledWith('a1'));
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: '删除成功' })
      )
    );
  });
});
