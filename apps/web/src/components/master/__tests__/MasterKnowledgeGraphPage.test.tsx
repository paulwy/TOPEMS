import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterKnowledgeGraphPage from '../MasterKnowledgeGraphPage';

vi.mock('@/api/master/knowledgeGraph', () => ({
  knowledgeGraphApi: {
    getAssetStats: vi.fn().mockResolvedValue({ data: { total_assets: 50, categories: [] } }),
    listCategories: vi.fn().mockResolvedValue({ data: [] }),
    getSubgraph: vi.fn().mockResolvedValue({ data: { nodes: [], edges: [] } }),
    searchAssets: vi.fn().mockResolvedValue({ data: [] }),
    getRecommendations: vi.fn().mockResolvedValue({ data: [] }),
    addNode: vi.fn().mockResolvedValue({ data: {} }),
    addEdge: vi.fn().mockResolvedValue({ data: {} }),
    findPath: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterKnowledgeGraphPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KG tabs（资产总览/图谱操作/搜索与路径/推荐）', async () => {
    renderWithProviders(<MasterKnowledgeGraphPage />);
    await waitFor(() => {
      expect(screen.getByText('资产总览')).toBeInTheDocument();
      expect(screen.getByText('搜索与路径')).toBeInTheDocument();
      expect(screen.getByText('推荐')).toBeInTheDocument();
    });
  });
});
