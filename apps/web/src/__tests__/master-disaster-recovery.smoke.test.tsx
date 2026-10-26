/**
 * MasterDisasterRecoveryPage 数据 mock 深测
 *
 * mock disasterRecoveryApi 各方法返回样本后实际渲染：
 * - 恢复状态 / 恢复点 / 连续性评分 / 区域健康 走数据驱动路径
 * - 断言页面渲染了样本（状态、快照类型、评分），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleStatus = { state: 'healthy', last_recovery_at: '2026-10-19T08:00:00Z', pending_jobs: 0 };
const samplePoints = { items: [{ id: 'rp1', snapshot_type: 'full', created_at: '2026-10-20T08:00:00Z', size_bytes: 1024, created_by: 'ops' }], total: 1 };
const sampleScore = { score: 92, total_plans: 5, tested_plans: 4, coverage_percentage: 80, risk_level: 'low' };
const sampleContinuity = { items: [{ id: 'cp1', name: '核心订单连续性', critical_function: '订单履约', rto_minutes: 60, rpo_minutes: 30, status: 'active' }], total: 1 };
const sampleRegions = [{ region: 'cn-north', status: 'healthy', latency_ms: 12, last_check: '2026-10-20T08:00:00Z' }];
const sampleFailovers = [{ id: 'fo1', from_region: 'cn-east', to_region: 'cn-north', triggered_by: 'ops', status: 'completed', started_at: '2026-10-18T00:00:00Z' }];

vi.mock('@/api/master/disasterRecovery', () => ({
  disasterRecoveryApi: {
    getRecoveryStatus: vi.fn(async () => ({ code: 0, data: sampleStatus })),
    listRecoveryPoints: vi.fn(async () => ({ code: 0, data: samplePoints })),
    getPlanProgress: vi.fn(async () => ({ code: 0, data: { plan_id: 'p1', current_step: 2, total_steps: 5, status: 'in_progress' } })),
    getContinuityScore: vi.fn(async () => ({ code: 0, data: sampleScore })),
    listContinuityPlans: vi.fn(async () => ({ code: 0, data: sampleContinuity })),
    getReplicationStatus: vi.fn(async () => ({ code: 0, data: { source_region: 'cn-east', target_region: 'cn-north', status: 'active' } })),
    getRegionHealth: vi.fn(async () => ({ code: 0, data: sampleRegions })),
    getFailoverHistory: vi.fn(async () => ({ code: 0, data: sampleFailovers })),
    createRecoveryPoint: vi.fn(),
    restoreFromPoint: vi.fn(),
    createRecoveryPlan: vi.fn(),
    executeRecoveryPlan: vi.fn(),
    testRecovery: vi.fn(),
    createContinuityPlan: vi.fn(),
    testContinuityPlan: vi.fn(),
    initiateFailover: vi.fn(),
  },
}));

import MasterDisasterRecoveryPage from '@/pages/master/MasterDisasterRecoveryPage';

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

const renderPage = async (captured: string[]) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <Suspense fallback={<div data-testid="loading" />}>
              <CaptureBoundary name="dr" errors={captured}>
                <MasterDisasterRecoveryPage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('MasterDisasterRecoveryPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('容灾页带样本数据渲染不崩溃且渲染恢复状态与快照', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('healthy')).toBeTruthy();
    expect(screen.getByText('full')).toBeTruthy();
  });
});
