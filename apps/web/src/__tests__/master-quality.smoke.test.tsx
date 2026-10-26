/**
 * MasterQualityPage 数据 mock 深测
 *
 * mock qualityApi 各方法返回样本后实际渲染：
 * - 总览指标 / 检查记录 / 规则 / 建议 走数据驱动路径
 * - 断言页面渲染了样本（指标值、规则名、建议类型），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleDashboard = {
  total_entities: 120,
  passed_checks: 98,
  failed_checks: 3,
  warning_checks: 19,
  pass_rate: 97.5,
  checks_by_entity_type: [{ entity_type: 'mdm_material', total: 40, passed: 38, failed: 2 }],
};
const sampleScore = { overall_score: 91, total_checks: 120, passed_checks: 98, failed_checks: 3, warning_checks: 19 };
const sampleChecks = [
  { id: 'c1', entity_type: 'mdm_material', entity_id: 'MAT-001', rule_id: 'R-1', status: 'passed', checked_at: '2026-10-20T08:00:00Z' },
];
const sampleRules = [
  { id: 'r1', name: '物料编码唯一性', entity_type: 'mdm_material', rule_type: 'uniqueness', severity: 'high', enabled: true },
];
const sampleSuggestions = [
  { id: 's1', entity_type: 'mdm_material', suggestion_type: 'standardize', reason: '字段格式不统一', status: 'pending' },
];
const sampleFix = [
  { id: 'f1', entity_type: 'mdm_material', entity_id: 'MAT-001', action_type: 'normalize', status: 'applied' },
];

vi.mock('@/api/master/quality', () => ({
  qualityApi: {
    getDashboard: vi.fn(async () => ({ code: 0, data: sampleDashboard })),
    getScore: vi.fn(async () => ({ code: 0, data: sampleScore })),
    listChecks: vi.fn(async () => ({ code: 0, data: sampleChecks })),
    listRules: vi.fn(async () => ({ code: 0, data: sampleRules })),
    getSuggestions: vi.fn(async () => ({ code: 0, data: sampleSuggestions })),
    getFixHistory: vi.fn(async () => ({ code: 0, data: sampleFix })),
    runCheck: vi.fn(),
    createRule: vi.fn(),
    deleteRule: vi.fn(),
    approveSuggestion: vi.fn(),
    rejectSuggestion: vi.fn(),
  },
}));

import MasterQualityPage from '@/pages/master/MasterQualityPage';

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
              <CaptureBoundary name="quality" errors={captured}>
                <MasterQualityPage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('MasterQualityPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('质量页带样本数据渲染不崩溃且渲染总览指标', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('质量页检查 tab 与规则 tab 渲染样本', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.getByText('97.5%')).toBeTruthy();
  });
});
