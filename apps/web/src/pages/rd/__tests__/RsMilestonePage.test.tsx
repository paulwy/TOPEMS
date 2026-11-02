import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsMilestonePage from '../RsMilestonePage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listBuilds: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        builds: [
          {
            id: 'MS001',
            build_no: 'BUILD-001',
            project_name: '研发平台',
            status: 'success',
            created_at: '2026-06-01T10:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    createBuild: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsMilestonePage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders h1 里程碑', async () => {
    renderWithProviders(<RsMilestonePage />);
    expect(await screen.findByRole('heading', { name: '里程碑' })).toBeInTheDocument();
  });

  it('renders milestone rows derived from builds', async () => {
    renderWithProviders(<RsMilestonePage />);
    await waitFor(() => {
      expect(screen.getByText(/BUILD-001 - 研发平台/)).toBeInTheDocument();
    });
  });
});
