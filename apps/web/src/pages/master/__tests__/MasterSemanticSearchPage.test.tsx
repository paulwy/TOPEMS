import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterSemanticSearchPage from '../MasterSemanticSearchPage';

vi.mock('@/api/master/semanticSearch', () => ({
  semanticSearchApi: {
    getSearchStats: vi
      .fn()
      .mockResolvedValue({ data: { indexed_entities: 1200, embeddings_dimension: 768, index_size_bytes: 4096, last_reindex_at: '2026-11-01' } }),
    searchSemantic: vi.fn().mockResolvedValue({ data: [] }),
    getSubgraph: vi.fn().mockResolvedValue({ data: { nodes: [], edges: [] } }),
    getTagsForEntity: vi.fn().mockResolvedValue({ data: [] }),
    reindexAll: vi.fn().mockResolvedValue({ data: {} }),
    findShortestPath: vi.fn().mockResolvedValue({ data: {} }),
    createTag: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterSemanticSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders semantic search tabs（语义检索/图谱操作/标签管理）', async () => {
    renderWithProviders(<MasterSemanticSearchPage />);
    await waitFor(() => {
      expect(screen.getByText('语义检索')).toBeInTheDocument();
      expect(screen.getByText('标签管理')).toBeInTheDocument();
    });
  });

  it('renders indexed entities stat（1200）', async () => {
    renderWithProviders(<MasterSemanticSearchPage />);
    await waitFor(() => {
      expect(screen.getByText('1200')).toBeInTheDocument();
    });
  });
});
