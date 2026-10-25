import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PermissionAuditPage from '../admin/PermissionAuditPage';
import { permissionAuditApi } from '@/api/admin/permissionAudit';

// PermissionAuditPage：4 useQuery（按 queryKey[1] 区分）+ tabs（permissionChanges/accessControl）
// + 2 个 ListPageTemplate（templates 路径）+ stats 卡（headerContent）+ refresh/export 动作——按真实行为断言
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

const storeMock = vi.hoisted(() => ({ addNotification: vi.fn() }));

// 本页 useNotificationStore 为 selector 式调用（(state) => state.addNotification）
vi.mock('@/store', () => ({
  useNotificationStore: (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
}));

const loggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    apiLogger: { error: loggerErrorMock },
  };
});

// useDebounce 直通（避免 300ms 定时器）
vi.mock('@topems/shared-hooks', () => ({
  useDebounce: (value: string) => value,
}));

const refetchMocks = {
  changes: vi.fn(),
  logs: vi.fn(),
  changeStats: vi.fn(),
  accessStats: vi.fn(),
};

// 部分 mock：4 useQuery 按 queryKey[1] 标识区分
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: (opts: { queryKey: string[]; queryFn: () => unknown }) => {
      const key = String(opts.queryKey[1] ?? '');
      if (key.includes('permission_changes_base')) {
        return {
          data: {
            items: [
              {
                id: 'pc-1',
                change_type: 'role_assignment',
                operator_name: '张工',
                status: 'success',
                created_at: '2026-10-25T00:00:00Z',
              },
            ],
            total: 1,
          },
          refetch: refetchMocks.changes,
          isError: false,
          isLoading: false,
        };
      }
      if (key.includes('access_logs_base')) {
        return {
          data: {
            items: [
              {
                id: 'al-1',
                access_time: '2026-10-25T00:00:00Z',
                access_type: 'login',
                user_name: '李工',
                resource_path: '/api/orders',
                ip_address: '10.0.0.1',
                device_type: 'Web',
                status: 'success',
                response_time: 32,
              },
            ],
            total: 1,
          },
          refetch: refetchMocks.logs,
          isError: false,
          isLoading: false,
        };
      }
      if (key.includes('permission_change_stats')) {
        return { data: { total: 10, success: 8, failed: 2 }, refetch: refetchMocks.changeStats };
      }
      return { data: { total: 50, success: 48, denied: 2 }, refetch: refetchMocks.accessStats };
    },
  };
});

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates', () => {
  const MockListPage = (props: Record<string, unknown>) => {
    mockListPage(props);
    return <div data-testid='list-page-template'>list-page-template</div>;
  };
  return { ListPageTemplate: MockListPage };
});

vi.mock('@/api/admin/permissionAudit', () => ({
  permissionAuditApi: {
    listPermissionChanges: vi
      .fn()
      .mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    listAccessLogs: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    getPermissionChangeStats: vi.fn().mockResolvedValue({ success: true, data: null }),
    getAccessControlStats: vi.fn().mockResolvedValue({ success: true, data: null }),
    exportPermissionChanges: vi.fn().mockResolvedValue(new Blob()),
    exportAccessLogs: vi.fn().mockResolvedValue(new Blob()),
  },
}));

describe('PermissionAuditPage（4 useQuery + tabs + 2 ListPageTemplate + stats）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom 无 createObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('默认 permissionChanges tab：ListPageTemplate（title/columns/data/pagination/actions 2）', () => {
    render(<PermissionAuditPage />);

    expect(screen.getAllByTestId('list-page-template').length).toBeGreaterThan(0);
    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('admin.permission_audit_page.title');
    expect(props.data).toHaveLength(1);
    expect(props.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 20, total: 1 }));
    expect(props.actions).toHaveLength(2);
    expect(props.searchable).toBe(true);
  });

  it('权限变更列渲染（change_type/status 返回 Chip 元素）', () => {
    render(<PermissionAuditPage />);
    const props = mockListPage.mock.calls.at(-1)[0];

    const typeCol = props.columns.find((c: { id: string }) => c.id === 'change_type');
    expect(typeCol.render({ change_type: 'role_assignment' })).not.toBeNull();
    const statusCol = props.columns.find((c: { id: string }) => c.id === 'status');
    expect(statusCol.render({ status: 'success' })).not.toBeNull();
    const operatorCol = props.columns.find((c: { id: string }) => c.id === 'operator');
    expect(operatorCol.render({ operator_name: '张工' })).not.toBeNull();
  });

  it('headerContent 渲染 tabs + stats 卡（点击可切换 accessControl）', () => {
    render(<PermissionAuditPage />);
    const props = mockListPage.mock.calls.at(-1)[0];

    // headerContent 为 JSX（stats 卡 + tabs 按钮）
    const { getByText } = render(<>{props.headerContent}</>);
    expect(getByText('admin.permission_audit_page.permission_change_stats')).toBeInTheDocument();

    // 点击 access tab → 页面 activeTab 切换 → 第二 ListPageTemplate（key=accessControl）
    fireEvent.click(getByText('admin.permission_audit_page.access_control_tab'));
    const accessProps = mockListPage.mock.calls.at(-1)[0];
    const rtCol = accessProps.columns.find((c: { id: string }) => c.id === 'response_time');
    expect(rtCol.render({ response_time: 32 }).props.children).toBe('32ms');
  });

  it('refresh 动作（permissionChanges tab）触发 changes + changeStats refetch', () => {
    render(<PermissionAuditPage />);
    const props = mockListPage.mock.calls.at(-1)[0];

    props.actions[0].onClick();
    expect(refetchMocks.changes).toHaveBeenCalled();
    expect(refetchMocks.changeStats).toHaveBeenCalled();
    // access 相关不触发（enabled=false + 分支不包含）
    expect(refetchMocks.logs).not.toHaveBeenCalled();
  });

  it('export 动作（permissionChanges tab）调 exportPermissionChanges + addNotification', async () => {
    render(<PermissionAuditPage />);
    const props = mockListPage.mock.calls.at(-1)[0];

    await props.actions[1].onClick();
    expect(permissionAuditApi.exportPermissionChanges).toHaveBeenCalledWith({ format: 'excel' });
    expect(storeMock.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });
});
