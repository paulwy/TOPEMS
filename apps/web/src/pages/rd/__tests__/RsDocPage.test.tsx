import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsDocPage from '../RsDocPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        total_projects: 2,
        total_experiments: 1,
        total_formulas: 1,
        total_tasks: 1,
      },
    }),
  },
}));

describe('RsDocPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 文档', async () => {
    renderWithProviders(<RsDocPage />);
    expect(await screen.findByRole('heading', { name: '文档' })).toBeInTheDocument();
  });

  it('renders doc rows derived from statistics', async () => {
    renderWithProviders(<RsDocPage />);
    await waitFor(() => {
      // First row doc_type is 设计文档 (from total_projects=2)
      expect(screen.getByTestId('cell-doc_type-0')).toHaveTextContent('设计文档');
    });
  });
});
