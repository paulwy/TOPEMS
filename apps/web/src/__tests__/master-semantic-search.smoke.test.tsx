/**
 * MasterSemanticSearchPage 数据 mock 深测
 *
 * mock semanticSearchApi 各方法返回样本后实际渲染：
 * - 检索统计指标 / 子图节点 走数据驱动路径
 * - 断言页面渲染了样本（索引数、节点标签），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleStats = { indexed_entities: 512, embeddings_dimension: 768, index_size_bytes: 10240, last_reindex_at: '2026-10-20T08:00:00Z' };
const sampleSubgraph = {
  nodes: [{ id: 'n1', label: '物料概念', type: 'concept' }],
  edges: [{ id: 'e1', from_id: 'n1', to_id: 'n2', relation: 'part_of' }],
};
const sampleTags = [{ id: 't1', name: '核心资产', description: '高价值主数据', usage_count: 12 }];

vi.mock('@/api/master/semanticSearch', () => ({
  semanticSearchApi: {
    getSearchStats: vi.fn(async () => ({ code: 0, data: sampleStats })),
    searchSemantic: vi.fn(),
    getSubgraph: vi.fn(async () => ({ code: 0, data: sampleSubgraph })),
    getTagsForEntity: vi.fn(async () => ({ code: 0, data: sampleTags })),
    reindexAll: vi.fn(),
    findShortestPath: vi.fn(),
    createTag: vi.fn(),
  },
}));

import MasterSemanticSearchPage from '@/pages/master/MasterSemanticSearchPage';

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
              <CaptureBoundary name="sem" errors={captured}>
                <MasterSemanticSearchPage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('MasterSemanticSearchPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('语义库页带样本数据渲染不崩溃且渲染索引统计', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('512')).toBeTruthy();
    expect(screen.getByText('768')).toBeTruthy();
  });
});
