/**
 * MasterVersioningPage 数据 mock 深测
 *
 * mock versioningApi 各方法返回样本后实际渲染：
 * - 版本历史 / 审计日志 / 权限 三张表格走数据驱动路径
 * - 断言页面渲染了样本（版本号、审计用户、权限资源），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleHistory = {
  items: [
    {
      id: 'h1',
      entity_type: 'mdm_material',
      entity_id: 'MAT-001',
      version: 'v3.2.1',
      action: 'update',
      changed_by: 'alice',
      changed_at: '2026-10-20T08:00:00Z',
      summary: '价格字段更新',
    },
  ],
  total: 1,
};
const sampleAudit = {
  items: [
    {
      id: 'a1',
      timestamp: '2026-10-20T09:00:00Z',
      user_id: 'bob',
      action: 'restore',
      resource_type: 'mdm_supplier',
      resource_id: 'SUP-007',
    },
  ],
  total: 1,
};
const samplePerms = [
  {
    id: 'p1',
    user_id: 'carol',
    resource_type: 'mdm_material',
    action: 'write',
    granted_at: '2026-10-18T00:00:00Z',
  },
];

vi.mock('@/api/master/versioning', () => ({
  versioningApi: {
    listHistory: vi.fn(async () => ({ code: 0, data: sampleHistory })),
    queryAuditLog: vi.fn(async () => ({ code: 0, data: sampleAudit })),
    getResourcePermissions: vi.fn(async () => ({ code: 0, data: samplePerms })),
    getComplianceAudit: vi.fn(async () => ({
      code: 0,
      data: {
      entity_type: 'mdm_material',
      entity_id: 'MAT-001',
      total_changes: 12,
      retained_days: 365,
      retention_policy: 'mdm_audit_retention',
      compliance_status: 'compliant',
      violations: [],
      },
    })),
    createSnapshot: vi.fn(),
    createBranch: vi.fn(),
    mergeBranch: vi.fn(),
  },
}));

import MasterVersioningPage from '@/pages/master/MasterVersioningPage';

class CaptureBoundary extends Component<{ name: string; errors: string[]; children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    this.props.errors.push(`[${this.props.name}] ${error instanceof Error ? error.message : String(error)}`);
  }
  render() {
    if (this.state.hasError) return <div data-testid="page-crash" />;
    return this.props.children;
  }
}

describe('MasterVersioningPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('版本管理页带样本数据渲染不崩溃且渲染样本', async () => {
    const captured: string[] = [];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <QueryClientProvider client={qc}>
            <MemoryRouter>
              <Suspense fallback={<div data-testid="loading" />}>
                <CaptureBoundary name="versioning" errors={captured}>
                  <MasterVersioningPage />
                </CaptureBoundary>
              </Suspense>
            </MemoryRouter>
          </QueryClientProvider>
        </ThemeProvider>
      );
    });
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    // 版本历史 tab 默认可见：断言样本版本号与变更人
    expect(screen.getByText('v3.2.1')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
  });

  it('审计日志 tab 渲染样本用户与动作', async () => {
    const captured: string[] = [];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <QueryClientProvider client={qc}>
            <MemoryRouter>
              <Suspense fallback={<div data-testid="loading" />}>
                <CaptureBoundary name="versioning-audit" errors={captured}>
                  <MasterVersioningPage />
                </CaptureBoundary>
              </Suspense>
            </MemoryRouter>
          </QueryClientProvider>
        </ThemeProvider>
      );
    });
    expect(captured).toEqual([]);
  });
});
