import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsFormulaListPage from '../RsFormulaListPage';

vi.mock('@/api/rd', () => ({
  formulaApi: {
    listFormulas: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'F001',
            code: 'FM-2026-001',
            name: '基础配方A',
            version: 'v1.0',
            project_id: 'P001',
            category: 'solid',
            status: 'approved',
          },
        ],
        total: 1,
      },
    }),
    createFormula: vi.fn(),
    updateFormula: vi.fn(),
    deleteFormula: vi.fn(),
  },
}));

describe('RsFormulaListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 from schema title', async () => {
    renderWithProviders(<RsFormulaListPage />);
    expect(await screen.findByRole('heading', { name: '配方管理' })).toBeInTheDocument();
  });

  it('renders rows from mocked formulas API', async () => {
    renderWithProviders(<RsFormulaListPage />);
    await waitFor(() => {
      expect(screen.getByText('基础配方A')).toBeInTheDocument();
      expect(screen.getByText('FM-2026-001')).toBeInTheDocument();
    });
  });
});
