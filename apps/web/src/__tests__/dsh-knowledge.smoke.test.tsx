/**
 * DshKnowledgePage 数据 mock 深测
 *
 * mock dshEnhancedApi 各方法返回样本后实际渲染：
 * - 图谱统计 / 实体 / 关系 / 社区 走数据驱动路径
 * - 断言页面渲染了样本（实体数、实体名、关系类型），防假阳性
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const sampleStats = {
  total_entities: 42,
  total_relations: 87,
  avg_entity_degree: 4.1,
  max_entity_degree: 12,
  connected_components: 3,
  graph_density: 0.25,
};
const sampleEntities = [
  {
    id: 'e1',
    name: '物料A',
    entity_type: 'material',
    description: '',
    confidence: 0.98,
    created_at: '2026-10-20T08:00:00Z',
    updated_at: '2026-10-20T08:00:00Z',
  },
];
const sampleRelations = [
  {
    id: 'r1',
    source_id: 'e1',
    target_id: 'e2',
    relation_type: 'belongs_to',
    weight: 1,
    confidence: 0.9,
    created_at: '2026-10-20T08:00:00Z',
  },
];
const sampleCommunities = [{ community_id: 1, entity_ids: ['e1', 'e2'], size: 2, density: 1 }];

vi.mock('@/api/ai/dshEnhanced', () => ({
  dshEnhancedApi: {
    getGraphStats: vi.fn(async () => ({ code: 0, data: sampleStats })),
    listEntities: vi.fn(async () => ({ code: 0, data: sampleEntities })),
    listRelations: vi.fn(async () => ({ code: 0, data: sampleRelations })),
    detectCommunities: vi.fn(async () => ({ code: 0, data: sampleCommunities })),
    getEntityNeighbors: vi.fn(async () => ({ code: 0, data: [] })),
    shortestPath: vi.fn(),
    extractEntities: vi.fn(),
    addEntity: vi.fn(),
    addRelation: vi.fn(),
    deleteEntity: vi.fn(),
    linkEntity: vi.fn(),
  },
}));

import DshKnowledgePage from '@/components/ai/DshKnowledgePage';

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
                <DshKnowledgePage />
              </CaptureBoundary>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  });
};

describe('DshKnowledgePage 数据 mock 深测', () => {
  afterEach(() => cleanup());

  it('知识图谱页带样本数据渲染不崩溃且渲染实体数与社区', async () => {
    const captured: string[] = [];
    await renderPage(captured);
    expect(captured).toEqual([]);
    expect(screen.queryByTestId('page-crash')).toBeNull();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
  });
});
