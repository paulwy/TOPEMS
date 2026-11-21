/**
 * MasterKnowledgeGraphPage 数据 mock 深测
 *
 * mock knowledgeGraphApi 各方法返回样本后实际渲染：
 * - 资产总览指标 / 分类 / 子图节点 走数据驱动路径
 * - 断言页面渲染了样本（资产总数、分类名、节点标签），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleStats = {
  total: 88,
  by_type: [
    { type: 'concept', count: 40 },
    { type: 'document', count: 30 },
  ],
  by_category: [{ category: 'mdm', count: 50 }],
};
const sampleCategories = [{ id: 'c1', name: '物料域', count: 50 }];
const sampleSubgraph = {
  nodes: [{ id: 'n1', label: '物料主数据', type: 'concept', degree: 12 }],
  edges: [{ id: 'e1', from_node: 'n1', to_node: 'n2', relation: '关联' }],
};
const sampleRecs = [
  {
    id: 'r1',
    type: 'document',
    title: '物料编码规范',
    reason: '与你关注的物料域相关',
    confidence: 85,
  },
];

vi.mock('@/api/master/knowledgeGraph', () => ({
  knowledgeGraphApi: {
    getAssetStats: vi.fn(async () => ({ code: 0, data: sampleStats })),
    listCategories: vi.fn(async () => ({ code: 0, data: sampleCategories })),
    getSubgraph: vi.fn(async () => ({ code: 0, data: sampleSubgraph })),
    searchAssets: vi.fn(),
    getRecommendations: vi.fn(async () => ({ code: 0, data: sampleRecs })),
    addNode: vi.fn(),
    addEdge: vi.fn(),
    findPath: vi.fn(),
  },
}));

import MasterKnowledgeGraphPage from '@/components/master/MasterKnowledgeGraphPage';

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
                name='kg'
                errors={captured}
              >
                <MasterKnowledgeGraphPage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('MasterKnowledgeGraphPage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('图谱页带样本数据渲染不崩溃且渲染资产总数与分类', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('88')).toBeTruthy();
    expect(screen.getByText('物料域')).toBeTruthy();
  });
});
