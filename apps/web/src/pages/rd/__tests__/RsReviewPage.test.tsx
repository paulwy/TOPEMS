import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsReviewPage from '../RsReviewPage';

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
            name: '配方V2.0',
            code: 'FORMULA-V2',
            version: '2.0',
            approval_status: 'pending',
            approved_by: null,
            approved_at: null,
            project_id: 'P001',
            description: '测试配方',
          },
        ],
        total: 1,
      },
    }),
    reviewFormula: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: { id: 'F001', approval_status: 'approved' },
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { username: 'tester', full_name: 'Tester' } }),
}));

describe('RsReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 配方评审', async () => {
    renderWithProviders(<RsReviewPage />);
    expect(await screen.findByRole('heading', { name: '配方评审' })).toBeInTheDocument();
  });

  it('renders formula rows from mocked API', async () => {
    renderWithProviders(<RsReviewPage />);
    await waitFor(() => {
      expect(screen.getByText('配方V2.0')).toBeInTheDocument();
    });
  });
});
