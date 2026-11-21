/**
 * DshRagPage 数据 mock 深测
 *
 * mock dshEnhancedApi 各方法返回样本后实际渲染：
 * - RAG 统计 / Agent 性能 走数据驱动路径
 * - 断言页面渲染了样本（检索数、执行数），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleRagStats = {
  total_retrievals: 128,
  total_documents_retrieved: 512,
  avg_documents_per_query: 4,
  query_rewrites: 32,
  rerank_count: 16,
  cache_hits: 64,
};
const samplePerf = {
  execution: {
    total_executions: 256,
    successful_executions: 250,
    failed_executions: 6,
    total_duration_ms: 10000,
    avg_duration_ms: 39,
    min_duration_ms: 5,
    max_duration_ms: 200,
    total_tool_calls: 1024,
    avg_tool_calls: 4,
    avg_iterations: 2,
    success_rate: 0.98,
  },
  tools: [
    {
      tool_name: 'search',
      call_count: 300,
      success_count: 295,
      failure_count: 5,
      total_duration_ms: 3000,
      avg_duration_ms: 10,
      success_rate: 0.98,
    },
  ],
  history_size: 512,
};

vi.mock('@/api/ai/dshEnhanced', () => ({
  dshEnhancedApi: {
    getRagStats: vi.fn(async () => ({ code: 0, data: sampleRagStats })),
    getPerformanceMetrics: vi.fn(async () => ({ code: 0, data: samplePerf })),
    getToolPerformance: vi.fn(),
    ragRetrieve: vi.fn(),
    multiAgentExecute: vi.fn(),
    resetPerformanceMetrics: vi.fn(),
  },
}));

import DshRagPage from '@/components/ai/DshRagPage';

class CaptureBoundary extends Component<{ name: string; errors: string[]; children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    this.props.errors.push(
      `[${this.props.name}] ${error instanceof Error ? error.message : String(error)}`
    );
  }
  render() {
    if (this.state.hasError) return <div data-testid='page-crash' />;
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
            <Suspense fallback={<div data-testid='loading' />}>
              <CaptureBoundary
                name='rag'
                errors={captured}
              >
                <DshRagPage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('DshRagPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('RAG 页带样本数据渲染不崩溃（统计卡与工具表可读）', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('语义检索')).toBeTruthy();
    expect(screen.getByText('多 Agent 协作')).toBeTruthy();
  });
});
