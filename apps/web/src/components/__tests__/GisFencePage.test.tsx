import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import GisFencePage from '../gis/GisFencePage';
import { gisApi } from '@/api/gis';
import fenceApi from '@/api/gis/fence';

// 自绘列表页（PageContainer + MUI Table + GisMapTemplate），走 CustomerManagementPage 形态：
// mock 页面实际 import 的两个 api 模块，断言三个 query 的调用、行渲染、空态/错误态与增删调用。
vi.mock('@/api/gis', () => ({
  gisApi: {
    listMapMarkers: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

vi.mock('@/api/gis/fence', () => ({
  default: {
    listGeoFences: vi.fn(),
    getGeoFence: vi.fn(),
    createGeoFence: vi.fn(),
    updateGeoFence: vi.fn(),
    deleteGeoFence: vi.fn(),
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

const fenceRecord = {
  id: 'f1',
  name: '一号围栏',
  shape_type: 'circle' as const,
  coordinates: { type: 'Point', coordinates: [116.4074, 39.9042] },
  radius: 100,
  event_types: ['enter', 'exit'],
  status: 'active' as const,
  created_at: '2026-01-01T00:00:00Z',
};

describe('GisFencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gisApi.listMapMarkers).mockResolvedValue({
      success: true,
      data: {
        items: [
          { id: 'm1', name: '仓库', position: { lat: 39.9, lng: 116.4 }, marker_type: 'storage' },
        ],
      },
    } as never);
    vi.mocked(gisApi.getStatistics).mockResolvedValue({
      success: true,
      data: { device_points: 5, pipelines: 2 },
    } as never);
    vi.mocked(fenceApi.listGeoFences).mockResolvedValue({
      success: true,
      data: { items: [fenceRecord] },
    } as never);
    vi.mocked(fenceApi.createGeoFence).mockResolvedValue({
      success: true,
      data: fenceRecord,
    } as never);
    vi.mocked(fenceApi.deleteGeoFence).mockResolvedValue({ success: true } as never);
  });

  it('renders heading, fence rows and calls the three queries with expected params', async () => {
    render(<GisFencePage />);

    expect(await screen.findByText('地理围栏管理')).toBeInTheDocument();
    expect(screen.getByText('创建围栏')).toBeInTheDocument();
    expect(screen.getByText('围栏列表')).toBeInTheDocument();

    // 行渲染：名称 / 类型圆形 / 状态激活
    expect(await screen.findByText('一号围栏')).toBeInTheDocument();
    expect(screen.getByText('圆形')).toBeInTheDocument();
    expect(screen.getByText('激活')).toBeInTheDocument();

    // API 参数：map markers 固定 page_size=50；围栏列表与统计无参
    await waitFor(() => expect(gisApi.listMapMarkers).toHaveBeenCalledWith({ page_size: 50 }));
    expect(fenceApi.listGeoFences).toHaveBeenCalledTimes(1);
    expect(gisApi.getStatistics).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no fences exist', async () => {
    vi.mocked(fenceApi.listGeoFences).mockResolvedValue({
      success: true,
      data: { items: [] },
    } as never);

    render(<GisFencePage />);

    expect(await screen.findByText('暂无围栏数据，可点击右上角新建')).toBeInTheDocument();
    expect(screen.queryByText('一号围栏')).not.toBeInTheDocument();
  });

  it('renders no-match empty state after filtering by search keyword', async () => {
    render(<GisFencePage />);
    await screen.findByText('一号围栏');

    fireEvent.change(screen.getByPlaceholderText('搜索围栏...'), {
      target: { value: '不存在的围栏' },
    });

    expect(await screen.findByText('未找到匹配的围栏')).toBeInTheDocument();
    expect(screen.queryByText('一号围栏')).not.toBeInTheDocument();
  });

  it('shows translated error alert when map markers query fails', async () => {
    vi.mocked(gisApi.listMapMarkers).mockResolvedValue({ success: false } as never);

    render(<GisFencePage />);

    expect(await screen.findByText('加载地图标记失败')).toBeInTheDocument();
  });

  it('calls deleteGeoFence with fence id when clicking the row delete button', async () => {
    render(<GisFencePage />);
    await screen.findByText('一号围栏');

    fireEvent.click(screen.getByLabelText('删除'));

    await waitFor(() => expect(fenceApi.deleteGeoFence).toHaveBeenCalledWith('f1'));
    await waitFor(() =>
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: '围栏删除成功' })
      )
    );
  });

  it('opens create dialog and calls createGeoFence with normalized GeoJSON payload', async () => {
    render(<GisFencePage />);
    await screen.findByText('一号围栏');

    fireEvent.click(screen.getByText('创建围栏'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('创建地理围栏');

    fireEvent.change(within(dialog).getByLabelText('围栏名称'), {
      target: { value: '测试围栏' },
    });
    fireEvent.change(within(dialog).getByLabelText('中心坐标'), {
      target: { value: '39.9042, 116.4074' },
    });

    // 对话框内的“创建围栏”保存按钮（与页头同名按钮，需限定在 dialog 内）
    fireEvent.click(within(dialog).getByRole('button', { name: '创建围栏' }));

    await waitFor(() =>
      expect(fenceApi.createGeoFence).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '测试围栏',
          shape_type: 'circle',
          event_types: ['enter', 'exit'],
          status: 'active',
          coordinates: { type: 'Point', coordinates: [116.4074, 39.9042] },
        })
      )
    );
  });
});
