import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsExperimentListPage from '../RsExperimentListPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listExperiments: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        experiments: [
          {
            id: 'E001',
            code: 'EXP-2026-001',
            name: '催化剂活性试验',
            project_id: 'P001',
            phase: 'lab',
            status: 'in_progress',
            experimenter: '李四',
          },
        ],
        total: 1,
      },
    }),
    listLabExperiments: vi.fn(),
    listPilotExperiments: vi.fn(),
    listScaleupExperiments: vi.fn(),
    createExperiment: vi.fn(),
    updateExperiment: vi.fn(),
    deleteExperiment: vi.fn(),
  },
}));

describe('RsExperimentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 from schema title', async () => {
    renderWithProviders(<RsExperimentListPage />);
    expect(await screen.findByRole('heading', { name: '试验管理' })).toBeInTheDocument();
  });

  it('renders rows from mocked experiments API', async () => {
    renderWithProviders(<RsExperimentListPage />);
    await waitFor(() => {
      expect(screen.getByText('催化剂活性试验')).toBeInTheDocument();
      expect(screen.getByText('EXP-2026-001')).toBeInTheDocument();
    });
  });
});
