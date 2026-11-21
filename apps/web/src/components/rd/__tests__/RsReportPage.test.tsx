import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsReportPage from '../RsReportPage';

vi.mock('@/api/client', () => ({
  apiClient: {
    rd: {
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          total_projects: 24,
          active_projects: 12,
          completed_projects: 8,
          delayed_projects: 4,
        },
      }),
    },
  },
}));

describe('RsReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards (project/experiment/formula stats)', async () => {
    renderWithProviders(<RsReportPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-project-stats')).toBeInTheDocument();
    });
    expect(screen.getByTestId('stat-card-experiment-stats')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-formula-stats')).toBeInTheDocument();
    expect(screen.getByText('项目统计')).toBeInTheDocument();
    expect(screen.getByText('试验统计')).toBeInTheDocument();
    expect(screen.getByText('配方统计')).toBeInTheDocument();
  });
});
