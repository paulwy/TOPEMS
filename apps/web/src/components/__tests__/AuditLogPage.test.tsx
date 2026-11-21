import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuditLogPage from '../desktop/AuditLogPage';
import { auditLogApi } from '@/api/admin/auditLog';

// AuditLogPage：非 useQuery（手动 state + fetchLogs）+ tauriAuth 触发 + ListPageTemplate（templates 路径）
// + 排序/分页/expandable + 3 actions（refresh/export/auto_refresh）——按真实行为断言
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates', () => {
  const MockListPage = (props: Record<string, unknown>) => {
    mockListPage(props);
    return <div data-testid='list-page-template'>list-page-template</div>;
  };
  return { ListPageTemplate: MockListPage };
});

const mockLogs = vi.hoisted(() => [
  {
    id: 'log-1',
    created_at: '2026-10-25T10:00:00Z',
    action: 'CREATE',
    resource: 'user',
    resource_id: 'u-1',
    user_id: 'usr-1',
    request_params: { name: '张工' },
  },
  {
    id: 'log-2',
    created_at: '2026-10-25T09:00:00Z',
    action: 'LOGIN',
    resource: 'auth',
    resource_id: '',
    user_id: 'usr-2',
  },
]);

vi.mock('@/api/admin/auditLog', () => ({
  auditLogApi: {
    listAuditLogs: vi.fn().mockResolvedValue({ data: { items: mockLogs } }),
  },
}));

vi.mock('../../services/TauriAuth', () => ({
  tauriAuth: { isAvailable: () => true },
}));

describe('AuditLogPage（手动 state + tauriAuth 触发 + ListPageTemplate + 排序/分页/export）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('tauriAuth 可用时首次 fetch + 数据映射后渲染 ListPageTemplate', async () => {
    render(<AuditLogPage />);

    await waitFor(() => expect(auditLogApi.listAuditLogs).toHaveBeenCalled());
    // 首次 fetch 无过滤参数
    expect(auditLogApi.listAuditLogs).toHaveBeenCalledWith(undefined);

    await screen.findByTestId('list-page-template');
    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('admin.audit_log.title');
    // 映射：created_at→timestamp、resource→target_type、resource_id→target_id、request_params→details
    expect(props.data).toHaveLength(2);
    expect(props.data[0]).toEqual(
      expect.objectContaining({
        timestamp: '2026-10-25T10:00:00Z',
        action: 'CREATE',
        target_type: 'user',
        target_id: 'u-1',
        user_id: 'usr-1',
        details: { name: '张工' },
      })
    );
    expect(props.actions).toHaveLength(3);
    expect(props.pagination).toEqual(expect.objectContaining({ page: 0, pageSize: 20, total: 2 }));
    expect(props.sortable).toBe(true);
    expect(props.defaultSortBy).toBe('timestamp');
  });

  it('列渲染（timestamp 格式化/action chip/target_type/target_id/user_id）', async () => {
    render(<AuditLogPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.columns).toHaveLength(5);
    const actionCol = props.columns.find((c: { id: string }) => c.id === 'action');
    expect(actionCol.render({ action: 'CREATE' })).not.toBeNull();
    const tsCol = props.columns.find((c: { id: string }) => c.id === 'timestamp');
    expect(tsCol.render({ timestamp: '2026-10-25T10:00:00Z' })).not.toBeNull();
  });

  it('expandable：有 details 渲染 JSON，无 details 渲染 —', async () => {
    render(<AuditLogPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const withDetails = props.expandable({
      id: 'log-1',
      details: { name: '张工' },
    });
    expect(withDetails.props.children.props.children).toContain('张工');
    const withoutDetails = props.expandable({ id: 'log-2' });
    expect(withoutDetails).not.toBeNull();
  });

  it('refresh 动作触发 fetchLogs（无过滤参数时传 undefined）', async () => {
    render(<AuditLogPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    props.actions[0].onClick();
    await waitFor(() => expect(auditLogApi.listAuditLogs).toHaveBeenCalledTimes(2));
  });

  it('export_json 动作：Blob + createObjectURL（有数据时）', async () => {
    render(<AuditLogPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    props.actions[1].onClick();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('auto_refresh 动作 toggle 变体', async () => {
    render(<AuditLogPage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.actions[2].variant).toBe('outlined');
    props.actions[2].onClick();
    await waitFor(() => {
      const after = mockListPage.mock.calls.at(-1)[0];
      expect(after.actions[2].variant).toBe('contained');
    });
  });
});
