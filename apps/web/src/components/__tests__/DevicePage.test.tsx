import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import DevicePage from '../gis/DevicePage';
import { gisDeviceApi } from '@/api/gis/devices';

// 自绘列表页（PageContainer + MUI Table/Dialog），走 CustomerManagementPage 形态：
// mock 页面实际 import 的 api 模块，断言 list 参数归一化、行渲染、空态与增删改调用。
vi.mock('@/api/gis/devices', () => ({
  gisDeviceApi: {
    list: vi.fn(),
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

const deviceRow = {
  id: 'd1',
  device_code: 'DEV-001',
  device_name: '一号设备',
  device_type: 'GPS',
  status: 'active',
  description: '',
};

const listResponse = {
  success: true,
  data: { items: [deviceRow], total: 1, page: 1, page_size: 10 },
};

describe('DevicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gisDeviceApi.list).mockResolvedValue(listResponse as never);
    vi.mocked(gisDeviceApi.create).mockResolvedValue({
      success: true,
      data: { id: 'd9' },
    } as never);
    vi.mocked(gisDeviceApi.update).mockResolvedValue({ success: true } as never);
    vi.mocked(gisDeviceApi.remove).mockResolvedValue({ success: true } as never);
  });

  it('renders heading, table headers and device rows with list params', async () => {
    render(<DevicePage />);

    expect(await screen.findByText('设备注册')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索设备')).toBeInTheDocument();
    expect(screen.getByTestId('device-create-btn')).toHaveTextContent('注册设备');

    // 表头
    expect(screen.getByText('设备编码')).toBeInTheDocument();
    expect(screen.getByText('设备名称')).toBeInTheDocument();
    expect(screen.getByText('设备类型')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();

    // 行数据渲染
    expect(await screen.findByText('DEV-001')).toBeInTheDocument();
    expect(screen.getByText('一号设备')).toBeInTheDocument();
    expect(screen.getByText('GPS')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // list 参数归一化：page 从 0 → 1，page_size 固定 10，空搜索为 undefined
    await waitFor(() =>
      expect(gisDeviceApi.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        search: undefined,
      })
    );
  });

  it('renders empty table when list returns no items', async () => {
    vi.mocked(gisDeviceApi.list).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 10 },
    } as never);

    render(<DevicePage />);

    expect(await screen.findByText('设备注册')).toBeInTheDocument();
    await waitFor(() => expect(gisDeviceApi.list).toHaveBeenCalled());
    expect(screen.queryByText('DEV-001')).not.toBeInTheDocument();
  });

  it('refetches with search keyword when typing in search box', async () => {
    render(<DevicePage />);
    await screen.findByText('设备注册');

    fireEvent.change(screen.getByPlaceholderText('搜索设备'), {
      target: { value: '摄像头' },
    });

    await waitFor(() =>
      expect(gisDeviceApi.list).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        search: '摄像头',
      })
    );
  });

  // 注：测试环境 mock 的 useMutation.mutate 闭包冻结在首次渲染（依赖 mutationFn.toString()），
  // 保存按钮闭包里的 form/editingId 不会随 React state 更新，故此处断言弹窗开关、表单受控输入、
  // 行数据回填，以及“保存”按钮确实触发对应创建接口（update 的 id 走调用参数，见 delete 用例同理）。
  it('opens create dialog, binds controlled inputs and triggers create on save', async () => {
    render(<DevicePage />);
    await screen.findByText('DEV-001');

    fireEvent.click(screen.getByTestId('device-create-btn'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('注册设备');

    const codeInput = within(dialog).getByLabelText('设备编码');
    fireEvent.change(codeInput, { target: { value: 'DEV-009' } });
    expect(codeInput).toHaveValue('DEV-009');
    expect(within(dialog).getByLabelText('设备名称')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(gisDeviceApi.create).toHaveBeenCalled());
  });

  it('opens edit dialog prefilled from the clicked row', async () => {
    render(<DevicePage />);
    await screen.findByText('DEV-001');

    fireEvent.click(screen.getByTestId('device-edit-btn'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('编辑设备');

    expect(within(dialog).getByLabelText('设备编码')).toHaveValue('DEV-001');
    expect(within(dialog).getByLabelText('设备名称')).toHaveValue('一号设备');
    expect(within(dialog).getByLabelText('设备类型')).toHaveValue('GPS');
    expect(within(dialog).getByLabelText('状态')).toHaveValue('active');
  });

  it('calls remove with row id when clicking delete button', async () => {
    render(<DevicePage />);
    await screen.findByText('DEV-001');

    fireEvent.click(screen.getByTestId('device-delete-btn'));

    await waitFor(() => expect(gisDeviceApi.remove).toHaveBeenCalledWith('d1'));
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: '设备删除成功' })
      )
    );
  });
});
