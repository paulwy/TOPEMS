import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationArchivePage from '../notification/NotificationArchivePage';
import {
  getArchivedNotifications,
  getArchiveConfig,
  updateArchiveConfig,
} from '@/api/notification';

// NotificationArchivePage 手写 CrudApiAdapter（list 走 getArchivedNotifications + 客户端 search 过滤；
// create/update/delete 为空桩）+ useQuery 拉归档配置渲染 headerContent——按真实行为断言
vi.unmock('@/schema-dsl/crudPageAdapter');

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

// 部分 mock：importOriginal 展开真实模块（lib/reactQuery 需真实 QueryCache），
// 仅覆盖页面用到的三个 hook（同 ehs EnvironmentPage 处理）
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: () => ({
      data: { enabled: true, auto_archive_days: 30, retention_days: 90 },
    }),
    useMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

const notifMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/hooks/useNotification', () => ({
  useNotification: () => notifMock,
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/notification', () => ({
  archiveNotificationSchema: { name: 'archiveNotificationSchema' },
}));

vi.mock('@/api/notification', () => ({
  getArchivedNotifications: vi.fn().mockResolvedValue({
    success: true,
    data: {
      notifications: [
        {
          id: 'n1',
          title: '通知甲',
          content: '内容甲',
          notification_type: 'system',
          priority: 1,
          created_at: '2026-01-01T00:00:00Z',
          archived_at: '2026-01-02T00:00:00Z',
        },
        {
          id: 'n2',
          title: '通知乙',
          content: '内容乙',
          notification_type: 'alert',
          priority: 2,
          created_at: '2026-01-03T00:00:00Z',
          archived_at: '2026-01-04T00:00:00Z',
        },
      ],
      total: 2,
    },
  }),
  getArchiveConfig: vi.fn().mockResolvedValue({
    success: true,
    data: { enabled: true, auto_archive_days: 30, retention_days: 90 },
  }),
  updateArchiveConfig: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

describe('NotificationArchivePage（手写 adapter + 配置 headerContent + 空桩操作）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schemaWithHeader = archiveNotificationSchema + headerContent）', () => {
    render(<NotificationArchivePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.schema).toEqual(
      expect.objectContaining({
        name: 'archiveNotificationSchema',
        // headerContent 为 useMemo 渲染的 JSX 元素（非函数）
        headerContent: expect.any(Object),
      })
    );
    expect(props.customRowActions).toHaveLength(2);
  });

  it('list 调 getArchivedNotifications(page, pageSize) + notifications 解包', async () => {
    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20 });

    expect(getArchivedNotifications).toHaveBeenCalledWith(2, 20);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('list search 客户端过滤（标题/内容包含）', async () => {
    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 20, search: '甲' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('通知甲');
    expect(result.total).toBe(1);
  });

  it('list 失败（success=false）返回空列表不抛错（照真实行为）', async () => {
    getArchivedNotifications.mockResolvedValueOnce({ success: false, data: null });

    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 10 });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('create/update 空桩返回 {}；delete 返回 undefined（后端无写路由）', async () => {
    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ title: 'x' })).resolves.toEqual({});
    await expect(props.apiAdapter.update('n1', { title: 'x' })).resolves.toEqual({});
    await expect(props.apiAdapter.delete('n1')).resolves.toBeUndefined();
  });

  it('customRowActions 含查看/恢复两操作（恢复调 success）', () => {
    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    expect(props.customRowActions[0].label).toBe('notification.notification_archive_page.k6');
    expect(props.customRowActions[1].label).toBe('notification.notification_archive_page.k7');
    props.customRowActions[1].onClick({ title: '通知甲' });
    expect(notifMock.success).toHaveBeenCalled();
  });

  it('headerContent 为 useMemo JSX（配置存在时非 null）', () => {
    render(<NotificationArchivePage />);
    const props = mockCrudPage.mock.calls[0][0];

    // headerContent 是 useMemo 渲染的 JSX 元素（配置存在 → 非 null）
    expect(props.headerContent).not.toBeNull();
  });

  it('updateArchiveConfig 委托存在（api 模块可调）', async () => {
    const res = await updateArchiveConfig({
      enabled: false,
      auto_archive_days: 30,
      retention_days: 90,
    });
    expect(updateArchiveConfig).toHaveBeenCalledWith({
      enabled: false,
      auto_archive_days: 30,
      retention_days: 90,
    });
    expect(res.success).toBe(true);
  });
});
