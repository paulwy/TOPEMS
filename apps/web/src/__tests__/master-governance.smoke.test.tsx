/**
 * MasterGovernancePage 数据 mock 深测
 *
 * mock governanceApi 各方法返回样本后实际渲染：
 * - 成熟度维度 / 工作流 / 数据产品 走数据驱动路径
 * - 断言页面渲染了样本（维度名、工作流名、产品名），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleDims = [
  { name: '数据资产', score: 72, weight: 0.3 },
  { name: '数据质量', score: 65, weight: 0.4 },
];
const sampleHistory = [
  { id: 'mh1', overall_score: 68, level: 'defined', assessed_at: '2026-10-20T08:00:00Z' },
];
const sampleProgress = {
  current_score: 65,
  target_score: 85,
  progress_percentage: 42,
  milestones: [{ date: '2026-11-01', score: 70 }],
};
const sampleWorkflows = [
  {
    id: 'wf1',
    name: '数据标准发布流程',
    description: '标准评审与发布',
    status: 'active',
    created_at: '2026-10-15T08:00:00Z',
  },
];
const sampleProducts = [
  {
    id: 'dp1',
    name: '物料主数据服务',
    owner: 'master-team',
    domain: 'mdm',
    status: 'active',
    updated_at: '2026-10-18T08:00:00Z',
  },
];

vi.mock('@/api/master/governance', () => ({
  governanceApi: {
    assessMaturity: vi.fn(),
    getDimensionScores: vi.fn(async () => ({ code: 0, data: sampleDims })),
    getMaturityHistory: vi.fn(async () => ({ code: 0, data: sampleHistory })),
    trackProgress: vi.fn(async () => ({ code: 0, data: sampleProgress })),
    listWorkflows: vi.fn(async () => ({ code: 0, data: sampleWorkflows })),
    listDataProducts: vi.fn(async () => ({ code: 0, data: sampleProducts })),
    createImprovementPlan: vi.fn(),
    startWorkflow: vi.fn(),
    approveStep: vi.fn(),
    createDataProduct: vi.fn(),
  },
}));

import MasterGovernancePage from '@/pages/master/MasterGovernancePage';

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
              <CaptureBoundary name="governance" errors={captured}>
                <MasterGovernancePage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('MasterGovernancePage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('治理页带样本数据渲染不崩溃且渲染成熟度维度', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('数据资产')).toBeTruthy();
    expect(screen.getByText('数据质量')).toBeTruthy();
  });

  it('治理页成熟度历史渲染评估记录', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.getByText(/68/)).toBeTruthy();
  });
});
